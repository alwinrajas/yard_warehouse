<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * LOCAL DEVELOPMENT ONLY — never run in staging or production.
 *
 * Creates one obviously-fake site and one administrator per role so the console
 * can be signed into before real customer data exists. Everything is prefixed
 * DEMO so it cannot be mistaken for the customer's configuration (mandate §2).
 *
 *   php artisan db:seed --class=Database\\Seeders\\LocalDevSeeder
 */
class LocalDevSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('LocalDevSeeder must never run in production.');
        }

        $site = Site::updateOrCreate(
            ['code' => 'DEMO-SITE'],
            ['name' => 'DEMO Plant (development only)', 'address' => 'Not a real address', 'is_active' => true],
        );

        $accounts = [
            ['username' => 'admin', 'name' => 'DEMO Super Admin', 'role' => 'SUPER_ADMIN'],
            ['username' => 'yardadmin', 'name' => 'DEMO Yard Admin', 'role' => 'YARD_ADMIN'],
            ['username' => 'supervisor', 'name' => 'DEMO Supervisor', 'role' => 'SUPERVISOR'],
            ['username' => 'operator', 'name' => 'DEMO PDA Operator', 'role' => 'PDA_OPERATOR'],
            ['username' => 'viewer', 'name' => 'DEMO Viewer', 'role' => 'VIEWER'],
        ];

        foreach ($accounts as $account) {
            $role = Role::where('code', $account['role'])->firstOrFail();
            User::updateOrCreate(
                ['username' => $account['username']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make('alutrack-dev'),
                    'role_id' => $role->id,
                    // docs/07 §4 SC-01: a null site means all sites, and that is
                    // reserved for Super Admin. Everyone else is pinned.
                    'site_id' => $account['role'] === 'SUPER_ADMIN' ? null : $site->id,
                    'is_active' => true,
                    'must_change_password' => false,
                ],
            );
        }

        if ($this->command !== null) {
            $this->command->warn('LocalDevSeeder: DEMO accounts created with password "alutrack-dev".');
        }
    }
}
