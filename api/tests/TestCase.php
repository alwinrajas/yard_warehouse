<?php

namespace Tests;

use App\Models\Facility;
use App\Models\Role;
use App\Models\Site;
use App\Models\User;
use Database\Seeders\ReasonCodeSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SystemSettingSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    protected function seedReferenceData(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $this->seed(ReasonCodeSeeder::class);
        $this->seed(SystemSettingSeeder::class);
    }

    /** Creates a user with a real seeded role, so permissions are the documented ones. */
    protected function userWithRole(string $roleCode, ?Site $site = null, array $facilities = []): User
    {
        $role = Role::where('code', $roleCode)->firstOrFail();

        $user = User::factory()->create([
            'role_id' => $role->id,
            'site_id' => $site?->id,
            'is_active' => true,
        ]);

        if ($facilities !== []) {
            $user->facilities()->sync(collect($facilities)->map(fn (Facility $f) => $f->id));
        }

        return $user;
    }

    protected function assertApiError(TestResponse $response, string $code, int $status): void
    {
        $response->assertStatus($status)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error.code', $code);
    }
}
