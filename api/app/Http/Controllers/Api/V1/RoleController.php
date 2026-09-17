<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use App\Support\PermissionRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Role administration (S-40, docs/07).
 *
 * Two rules keep this from becoming a privilege-escalation surface, and both are
 * enforced here rather than in the UI:
 *
 *  1. Nobody can grant a permission they do not themselves hold. Without this,
 *     `role.edit` is equivalent to every permission in the system.
 *  2. Nobody can edit the role they are currently signed in under, so a mistake
 *     cannot lock an administrator out of fixing it, and self-elevation needs a
 *     second person.
 */
class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::withCount(['permissions', 'users'])
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get();

        return ApiResponse::success(RoleResource::collection($roles)->resolve());
    }

    public function show(Role $role): JsonResponse
    {
        return ApiResponse::resource(new RoleResource(
            $role->load('permissions')->loadCount(['permissions', 'users']),
        ));
    }

    /** The full vocabulary, grouped as the screen presents it. */
    public function permissions(): JsonResponse
    {
        $descriptions = PermissionRegistry::all();

        $groups = Permission::orderBy('module')->orderBy('code')->get()
            ->groupBy('module')
            ->map(fn ($items, $module) => [
                'module' => $module,
                'permissions' => $items->map(fn (Permission $p) => [
                    'id' => (string) $p->id,
                    'code' => $p->code,
                    'description' => $descriptions[$p->code] ?? $p->description,
                ])->values(),
            ])
            ->values();

        return ApiResponse::success(['groups' => $groups]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:40', 'regex:/^[A-Z][A-Z0-9_]*$/', 'unique:roles,code'],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['array'],
            'permissions.*' => ['string'],
        ]);

        $ids = $this->resolveGrantable($request->user(), $data['permissions'] ?? []);

        $role = DB::transaction(function () use ($data, $ids) {
            $role = Role::create([
                'code' => $data['code'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_system' => false,
                'is_active' => true,
            ]);
            $role->permissions()->sync($ids);

            return $role;
        });

        AuditLogger::record('role.created', $role, [], [
            'code' => $role->code,
            'name' => $role->name,
            'permissions' => $data['permissions'] ?? [],
        ]);

        return ApiResponse::resource(
            new RoleResource($role->load('permissions')->loadCount(['permissions', 'users'])),
            201,
        );
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $this->assertNotOwnRole($request->user(), $role);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'permissions' => ['array'],
            'permissions.*' => ['string'],
        ]);

        // A system role's code is referenced by scoping logic and by the seeder;
        // its name and grants are editable, its identity is not.
        if ($role->is_system && array_key_exists('is_active', $data) && ! $data['is_active']) {
            throw new BusinessRuleException(
                'SYSTEM_ROLE_REQUIRED',
                'A built-in role cannot be deactivated. Move its users to another role instead.',
                422,
            );
        }

        $ids = array_key_exists('permissions', $data)
            ? $this->resolveGrantable($request->user(), $data['permissions'])
            : null;

        $before = $role->getAttributes();
        $beforePermissions = $role->permissions()->pluck('code')->sort()->values()->all();

        DB::transaction(function () use ($role, $data, $ids) {
            $role->fill([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
            ]);
            if (array_key_exists('is_active', $data)) {
                $role->is_active = $data['is_active'];
            }
            $role->save();

            if ($ids !== null) {
                $role->permissions()->sync($ids);
            }
        });

        AuditLogger::recordChange('role.updated', $role, $before);

        $afterPermissions = $role->permissions()->pluck('code')->sort()->values()->all();
        if ($afterPermissions !== $beforePermissions) {
            AuditLogger::record(
                'role.permissions_changed',
                $role,
                ['permissions' => $beforePermissions],
                ['permissions' => $afterPermissions],
                [
                    'granted' => array_values(array_diff($afterPermissions, $beforePermissions)),
                    'revoked' => array_values(array_diff($beforePermissions, $afterPermissions)),
                ],
            );
        }

        return ApiResponse::resource(
            new RoleResource($role->load('permissions')->loadCount(['permissions', 'users'])),
        );
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        $this->assertNotOwnRole($request->user(), $role);

        if ($role->is_system) {
            throw new BusinessRuleException(
                'SYSTEM_ROLE_PROTECTED',
                'Built-in roles cannot be deleted.',
                422,
            );
        }

        $users = User::where('role_id', $role->id)->count();
        if ($users > 0) {
            throw new BusinessRuleException(
                'ROLE_IN_USE',
                'This role still has users assigned. Move them to another role first.',
                409,
                ['user_count' => $users],
            );
        }

        AuditLogger::record('role.deleted', $role, ['code' => $role->code, 'name' => $role->name], []);
        $role->delete();

        return ApiResponse::success(['deleted' => true]);
    }

    /**
     * Maps permission codes to ids, refusing any the actor does not hold.
     *
     * @param  list<string>  $codes
     * @return list<int>
     */
    private function resolveGrantable(User $actor, array $codes): array
    {
        $codes = array_values(array_unique($codes));

        $unknown = array_values(array_diff($codes, array_keys(PermissionRegistry::all())));
        if ($unknown !== []) {
            throw new BusinessRuleException(
                'UNKNOWN_PERMISSION',
                'One or more permissions do not exist.',
                422,
                ['permissions' => $unknown],
            );
        }

        $notHeld = array_values(array_filter($codes, fn (string $c) => ! $actor->hasPermission($c)));
        if ($notHeld !== []) {
            throw new BusinessRuleException(
                'PERMISSION_NOT_HELD',
                'You cannot grant a permission you do not hold yourself.',
                403,
                ['permissions' => $notHeld],
            );
        }

        return Permission::whereIn('code', $codes)->pluck('id')->all();
    }

    private function assertNotOwnRole(User $actor, Role $role): void
    {
        if ($actor->role_id === $role->id) {
            throw new BusinessRuleException(
                'CANNOT_EDIT_OWN_ROLE',
                'You cannot change the role you are signed in under. Ask another administrator.',
                403,
            );
        }
    }
}
