<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use App\Support\PermissionRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with(['role', 'site', 'facilities']);

        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('username', 'like', "%{$search}%")
                ->orWhere('employee_code', 'like', "%{$search}%"));
        }
        if ($role = $request->query('role_id')) {
            $query->where('role_id', $role);
        }
        if (($status = $request->query('status')) !== null && $status !== 'all') {
            $query->where('is_active', $status === 'active');
        }

        $query->orderBy('name');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            UserResource::class,
        );
    }

    public function show(User $user): JsonResponse
    {
        return ApiResponse::resource(new UserResource($user->load(['role', 'site', 'facilities'])));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'max:100', 'unique:users,username', 'regex:/^[A-Za-z0-9._\-]+$/'],
            'employee_code' => ['nullable', 'string', 'max:50', 'unique:users,employee_code'],
            'email' => ['nullable', 'email', 'max:190'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'facility_ids' => ['sometimes', 'array'],
            'facility_ids.*' => ['integer', 'exists:facilities,id'],
            'password' => ['required', 'string', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);

        $user = DB::transaction(function () use ($data) {
            $created = User::create([
                'name' => $data['name'],
                'username' => $data['username'],
                'employee_code' => $data['employee_code'] ?? null,
                'email' => $data['email'] ?? null,
                'role_id' => $data['role_id'],
                'site_id' => $data['site_id'] ?? null,
                'password' => Hash::make($data['password']),
                'is_active' => true,
                'must_change_password' => true,
            ]);

            if (! empty($data['facility_ids'])) {
                $created->facilities()->sync($data['facility_ids']);
            }

            AuditLogger::record('user.created', $created, [], [
                'username' => $created->username, 'role_id' => $created->role_id,
            ]);

            return $created;
        });

        return ApiResponse::resource(new UserResource($user->load(['role', 'site', 'facilities'])), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'employee_code' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:190'],
            'role_id' => ['sometimes', 'integer', 'exists:roles,id'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'facility_ids' => ['sometimes', 'array'],
            'facility_ids.*' => ['integer', 'exists:facilities,id'],
        ]);

        DB::transaction(function () use ($user, $data) {
            $before = $user->getAttributes();
            $user->fill($data)->save();

            if (array_key_exists('facility_ids', $data)) {
                $user->facilities()->sync($data['facility_ids']);
            }

            AuditLogger::recordChange('user.updated', $user, $before);
        });

        return ApiResponse::resource(new UserResource($user->refresh()->load(['role', 'site', 'facilities'])));
    }

    public function setActive(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);

        if (! $data['is_active'] && $user->id === $request->user()->id) {
            throw new BusinessRuleException('CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own account.', 422);
        }

        $before = $user->getAttributes();
        $user->forceFill(['is_active' => $data['is_active']])->save();

        // Deactivation must end the session now, not at next token expiry (docs/09 §3).
        if (! $data['is_active']) {
            $user->tokens()->delete();
        }

        AuditLogger::recordChange($data['is_active'] ? 'user.activated' : 'user.deactivated', $user, $before);

        return ApiResponse::resource(new UserResource($user->refresh()->load(['role', 'site', 'facilities'])));
    }

    public function resetPassword(User $user): JsonResponse
    {
        $temporary = Str::password(14);

        $user->forceFill([
            'password' => Hash::make($temporary),
            'must_change_password' => true,
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ])->save();
        $user->tokens()->delete();

        AuditLogger::record('user.password_reset', $user);

        // Shown once, never emailed and never stored in plain text.
        return ApiResponse::success(['temporary_password' => $temporary]);
    }

    /** Roles with their permission sets, for the RBAC screen. */
    public function roles(): JsonResponse
    {
        $roles = Role::with('permissions')->orderBy('name')->get();

        return ApiResponse::success([
            'roles' => $roles->map(fn (Role $role) => [
                'id' => (string) $role->id,
                'code' => $role->code,
                'name' => $role->name,
                'description' => $role->description,
                'is_system' => $role->is_system,
                'user_count' => User::where('role_id', $role->id)->count(),
                'permissions' => $role->permissions->pluck('code')->values(),
            ])->values(),
            'permissions' => collect(PermissionRegistry::all())->map(fn ($description, $code) => [
                'code' => $code,
                'module' => explode('.', $code)[0],
                'description' => $description,
            ])->values(),
        ]);
    }
}
