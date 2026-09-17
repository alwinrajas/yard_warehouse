<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
    }

    private function credentialsFor(string $role, string $password = 'Str0ng!Password99'): User
    {
        $user = $this->userWithRole($role);
        $user->forceFill(['password' => Hash::make($password)])->save();

        return $user;
    }

    public function test_signs_in_and_returns_the_permission_set(): void
    {
        $user = $this->credentialsFor('SUPERVISOR');

        $response = $this->postJson('/api/v1/auth/login', [
            'username' => $user->username,
            'password' => 'Str0ng!Password99',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'SUPERVISOR')
            ->assertJsonStructure(['data' => ['token', 'expires_at', 'user' => ['permissions']]]);

        // Supervisors are denied corrections by default (docs/07 §3.4).
        $this->assertNotContains('correction.perform', $response->json('data.user.permissions'));
        $this->assertDatabaseHas('audit_logs', ['event' => 'login.success']);
    }

    public function test_rejects_a_wrong_password_and_records_the_attempt(): void
    {
        $user = $this->credentialsFor('SUPER_ADMIN');

        $this->assertApiError(
            $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'wrong']),
            'INVALID_CREDENTIALS',
            401,
        );

        $this->assertDatabaseHas('audit_logs', ['event' => 'login.failed']);
        $this->assertSame(1, $user->refresh()->failed_login_attempts);
    }

    public function test_locks_the_account_after_five_failures(): void
    {
        $user = $this->credentialsFor('SUPER_ADMIN');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'wrong']);
        }

        $this->assertTrue($user->refresh()->isLocked());

        $this->assertApiError(
            $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'Str0ng!Password99']),
            'ACCOUNT_LOCKED',
            423,
        );
    }

    public function test_refuses_a_pda_operator_on_the_web_channel(): void
    {
        $user = $this->credentialsFor('PDA_OPERATOR');

        $this->assertApiError(
            $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'Str0ng!Password99']),
            'NO_WEB_ACCESS',
            403,
        );
    }

    public function test_refuses_a_viewer_on_the_pda_channel(): void
    {
        $user = $this->credentialsFor('VIEWER');

        $this->assertApiError(
            $this->postJson('/api/v1/auth/login', [
                'username' => $user->username, 'password' => 'Str0ng!Password99', 'channel' => 'PDA',
            ]),
            'NO_WEB_ACCESS',
            403,
        );
    }

    public function test_refuses_an_inactive_account(): void
    {
        $user = $this->credentialsFor('SUPER_ADMIN');
        $user->forceFill(['is_active' => false])->save();

        // A real request resolves the guard from scratch; inside one test the
        // container is shared, so the guard would otherwise hand back the stale
        // user it already resolved.
        $this->app['auth']->forgetGuards();

        $this->assertApiError(
            $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'Str0ng!Password99']),
            'ACCOUNT_INACTIVE',
            403,
        );
    }

    public function test_a_second_pda_login_revokes_the_first(): void
    {
        // CFG-20 — this is what makes "no shared credentials" operationally true.
        $user = $this->credentialsFor('PDA_OPERATOR');

        $first = $this->postJson('/api/v1/auth/login', [
            'username' => $user->username, 'password' => 'Str0ng!Password99', 'channel' => 'PDA', 'device_id' => 'PDA-01',
        ])->json('data.token');

        $this->postJson('/api/v1/auth/login', [
            'username' => $user->username, 'password' => 'Str0ng!Password99', 'channel' => 'PDA', 'device_id' => 'PDA-02',
        ])->assertOk();

        $this->assertSame(1, $user->tokens()->where('channel', 'PDA')->count());
        $this->withHeader('Authorization', "Bearer {$first}")->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_deactivating_a_user_ends_their_session_immediately(): void
    {
        $user = $this->credentialsFor('SUPER_ADMIN');
        $token = $this->postJson('/api/v1/auth/login', [
            'username' => $user->username, 'password' => 'Str0ng!Password99',
        ])->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/auth/me')->assertOk();

        $user->forceFill(['is_active' => false])->save();

        // A real request resolves the guard from scratch; inside one test the
        // container is shared, so the guard would otherwise hand back the stale
        // user it already resolved.
        $this->app['auth']->forgetGuards();

        $this->assertApiError(
            $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/auth/me'),
            'ACCOUNT_INACTIVE',
            401,
        );
    }

    public function test_changes_a_password_and_clears_the_forced_flag(): void
    {
        $user = $this->credentialsFor('SUPER_ADMIN');
        $user->forceFill(['must_change_password' => true])->save();

        $this->actingAs($user)->postJson('/api/v1/auth/change-password', [
            'current_password' => 'Str0ng!Password99',
            'new_password' => 'An0ther!Password88',
            'new_password_confirmation' => 'An0ther!Password88',
        ])->assertOk();

        $user->refresh();
        $this->assertFalse($user->must_change_password);
        $this->assertTrue(Hash::check('An0ther!Password88', $user->password));
        $this->assertDatabaseHas('audit_logs', ['event' => 'password.changed']);
    }

    public function test_rejects_a_weak_or_reused_password(): void
    {
        $user = $this->credentialsFor('SUPER_ADMIN');

        $this->assertApiError(
            $this->actingAs($user)->postJson('/api/v1/auth/change-password', [
                'current_password' => 'Str0ng!Password99',
                'new_password' => 'short',
                'new_password_confirmation' => 'short',
            ]),
            'VALIDATION_FAILED',
            422,
        );

        $this->assertApiError(
            $this->actingAs($user)->postJson('/api/v1/auth/change-password', [
                'current_password' => 'Str0ng!Password99',
                'new_password' => 'Str0ng!Password99',
                'new_password_confirmation' => 'Str0ng!Password99',
            ]),
            'PASSWORD_POLICY',
            422,
        );
    }

    public function test_health_endpoints_are_public(): void
    {
        $this->getJson('/api/v1/health')->assertOk()->assertJsonPath('data.status', 'ok');
        $this->getJson('/api/v1/health/ready')->assertOk();
    }
}
