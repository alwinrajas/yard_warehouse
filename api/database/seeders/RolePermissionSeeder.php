<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionRegistry;
use Illuminate\Database\Seeder;

/**
 * Reference data only — the permission vocabulary and the five BRD roles.
 * Contains no customer configuration and no inventory (mandate §2).
 */
class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (PermissionRegistry::all() as $code => $description) {
            [$module, $action] = array_pad(explode('.', $code, 2), 2, '');
            Permission::updateOrCreate(
                ['code' => $code],
                ['module' => $module, 'action' => $action, 'description' => $description],
            );
        }

        $permissionIds = Permission::pluck('id', 'code');

        foreach (PermissionRegistry::roles() as $code => $meta) {
            $role = Role::updateOrCreate(
                ['code' => $code],
                ['name' => $meta['name'], 'description' => $meta['description'], 'is_system' => true, 'is_active' => true],
            );

            $grants = PermissionRegistry::roleGrants()[$code] ?? [];
            $role->permissions()->sync(
                collect($grants)->map(fn ($c) => $permissionIds[$c] ?? null)->filter()->all(),
            );
        }
    }
}
