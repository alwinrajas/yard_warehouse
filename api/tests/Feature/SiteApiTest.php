<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Site;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
    }

    public function test_creates_a_site_and_writes_an_audit_record(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');

        $response = $this->actingAs($admin)->postJson('/api/v1/sites', [
            'code' => 'PLANT-1',
            'name' => 'Plant One',
            'address' => 'Somewhere',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'PLANT-1')
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('sites', ['code' => 'PLANT-1']);
        $this->assertDatabaseHas('audit_logs', ['event' => 'site.created', 'user_id' => $admin->id]);
    }

    public function test_rejects_a_duplicate_site_code(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        Site::factory()->create(['code' => 'PLANT-1']);

        $response = $this->actingAs($admin)->postJson('/api/v1/sites', [
            'code' => 'PLANT-1',
            'name' => 'Another',
        ]);

        $this->assertApiError($response, 'DUPLICATE_CODE', 409);
        $this->assertSame(1, Site::where('code', 'PLANT-1')->count());
    }

    public function test_enforces_uniqueness_at_the_database_level_too(): void
    {
        Site::factory()->create(['code' => 'PLANT-1']);

        $this->expectException(QueryException::class);
        Site::query()->insert(['code' => 'PLANT-1', 'name' => 'Bypass', 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_rejects_invalid_data(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');

        $response = $this->actingAs($admin)->postJson('/api/v1/sites', ['code' => 'has space!', 'name' => '']);

        $this->assertApiError($response, 'VALIDATION_FAILED', 422);
        $response->assertJsonStructure(['error' => ['details' => ['fields' => ['code', 'name']]]]);
    }

    public function test_denies_creation_without_permission(): void
    {
        // Yard Admin may not create sites (docs/07 §3.2).
        $response = $this->actingAs($this->userWithRole('YARD_ADMIN'))
            ->postJson('/api/v1/sites', ['code' => 'PLANT-9', 'name' => 'Nine']);

        $this->assertApiError($response, 'PERMISSION_DENIED', 403);
        $this->assertDatabaseMissing('sites', ['code' => 'PLANT-9']);
    }

    public function test_requires_authentication(): void
    {
        $this->assertApiError($this->getJson('/api/v1/sites'), 'UNAUTHENTICATED', 401);
    }

    public function test_viewer_can_read_but_not_write(): void
    {
        $viewer = $this->userWithRole('VIEWER');
        Site::factory()->count(2)->create();

        $this->actingAs($viewer)->getJson('/api/v1/sites')->assertOk()->assertJsonCount(2, 'data');
        $this->assertApiError(
            $this->actingAs($viewer)->postJson('/api/v1/sites', ['code' => 'X', 'name' => 'X']),
            'PERMISSION_DENIED',
            403,
        );
    }

    public function test_deactivates_a_site(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();

        $this->actingAs($admin)->postJson("/api/v1/sites/{$site->id}/status", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('audit_logs', ['event' => 'site.deactivated']);
    }

    public function test_refuses_to_delete_a_site_that_still_has_facilities(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();
        Facility::factory()->create(['site_id' => $site->id]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/sites/{$site->id}");

        $this->assertApiError($response, 'RECORD_IN_USE', 409);
        $this->assertDatabaseHas('sites', ['id' => $site->id, 'deleted_at' => null]);
    }

    public function test_paginates_and_filters(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        Site::factory()->count(7)->create();
        Site::factory()->inactive()->create(['code' => 'OLD-1']);

        $this->actingAs($admin)->getJson('/api/v1/sites?pageSize=5')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.pagination.total', 8)
            ->assertJsonPath('meta.pagination.pageSize', 5);

        $this->actingAs($admin)->getJson('/api/v1/sites?status=inactive')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'OLD-1');

        $this->actingAs($admin)->getJson('/api/v1/sites?search=OLD')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_a_site_scoped_user_sees_only_their_site(): void
    {
        $mine = Site::factory()->create();
        Site::factory()->create();
        $user = $this->userWithRole('YARD_ADMIN', $mine);

        $this->actingAs($user)->getJson('/api/v1/sites')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', (string) $mine->id);
    }

    public function test_error_responses_never_leak_internals(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $response = $this->actingAs($admin)->getJson('/api/v1/sites/999999');

        $this->assertApiError($response, 'NOT_FOUND', 404);
        $body = $response->getContent();
        $this->assertStringNotContainsString('SQLSTATE', $body);
        $this->assertStringNotContainsString('Illuminate\\', $body);
        $this->assertStringNotContainsString('vendor', $body);
    }
}
