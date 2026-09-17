<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Production-safe seeders only: the permission vocabulary, the five BRD roles,
 * the reason-code vocabulary and the configuration register.
 *
 * No site, facility, zone or location is seeded. Those are customer inputs
 * (OI-03) and must never be fabricated (mandate §2). Use `db:seed --class=LocalDevSeeder`
 * for a throwaway local dataset.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            ReasonCodeSeeder::class,
            SystemSettingSeeder::class,
        ]);
    }
}
