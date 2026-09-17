<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Location;
use App\Models\Site;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilityApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
    }

    public function test_creates_a_facility(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();

        $this->actingAs($admin)->postJson('/api/v1/facilities', [
            'site_id' => $site->id,
            'code' => 'YD-A',
            'name' => 'Open Yard A',
            'type' => 'OPEN_YARD',
        ])->assertCreated()->assertJsonPath('data.type', 'OPEN_YARD');

        $this->assertDatabaseHas('audit_logs', ['event' => 'facility.created']);
    }

    public function test_rejects_an_unknown_site(): void
    {
        $response = $this->actingAs($this->userWithRole('SUPER_ADMIN'))->postJson('/api/v1/facilities', [
            'site_id' => 999999,
            'code' => 'YD-A',
            'name' => 'Yard',
            'type' => 'OPEN_YARD',
        ]);

        $this->assertApiError($response, 'VALIDATION_FAILED', 422);
    }

    public function test_rejects_an_inactive_parent_site(): void
    {
        $site = Site::factory()->inactive()->create();

        $response = $this->actingAs($this->userWithRole('SUPER_ADMIN'))->postJson('/api/v1/facilities', [
            'site_id' => $site->id,
            'code' => 'YD-A',
            'name' => 'Yard',
            'type' => 'OPEN_YARD',
        ]);

        $this->assertApiError($response, 'PARENT_INACTIVE', 422);
    }

    public function test_rejects_an_invalid_facility_type(): void
    {
        $site = Site::factory()->create();

        $response = $this->actingAs($this->userWithRole('SUPER_ADMIN'))->postJson('/api/v1/facilities', [
            'site_id' => $site->id,
            'code' => 'YD-A',
            'name' => 'Yard',
            'type' => 'ROOFTOP',
        ]);

        $this->assertApiError($response, 'VALIDATION_FAILED', 422);
    }

    public function test_facility_code_is_unique_within_a_site_but_reusable_across_sites(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $siteA = Site::factory()->create();
        $siteB = Site::factory()->create();
        Facility::factory()->create(['site_id' => $siteA->id, 'code' => 'YD-A']);

        $this->assertApiError(
            $this->actingAs($admin)->postJson('/api/v1/facilities', [
                'site_id' => $siteA->id, 'code' => 'YD-A', 'name' => 'Dup', 'type' => 'OPEN_YARD',
            ]),
            'DUPLICATE_CODE',
            409,
        );

        $this->actingAs($admin)->postJson('/api/v1/facilities', [
            'site_id' => $siteB->id, 'code' => 'YD-A', 'name' => 'Other site', 'type' => 'OPEN_YARD',
        ])->assertCreated();
    }

    public function test_refuses_to_move_a_facility_between_sites(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $facility = Facility::factory()->create();
        $other = Site::factory()->create();

        $response = $this->actingAs($admin)->putJson("/api/v1/facilities/{$facility->id}", [
            'site_id' => $other->id,
        ]);

        $this->assertApiError($response, 'FACILITY_SITE_IMMUTABLE', 422);
    }

    public function test_refuses_a_type_change_once_locations_exist(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $facility = Facility::factory()->create(['type' => 'OPEN_YARD']);
        Location::factory()->create(['facility_id' => $facility->id, 'site_id' => $facility->site_id]);

        $response = $this->actingAs($admin)->putJson("/api/v1/facilities/{$facility->id}", [
            'type' => 'CLOSED_WAREHOUSE',
        ]);

        $this->assertApiError($response, 'FACILITY_TYPE_LOCKED', 409);
    }

    public function test_denies_creation_without_permission(): void
    {
        $response = $this->actingAs($this->userWithRole('SUPERVISOR'))->postJson('/api/v1/facilities', [
            'site_id' => Site::factory()->create()->id,
            'code' => 'YD-B', 'name' => 'B', 'type' => 'OPEN_YARD',
        ]);

        $this->assertApiError($response, 'PERMISSION_DENIED', 403);
    }

    public function test_facility_scope_hides_other_facilities(): void
    {
        $site = Site::factory()->create();
        $mine = Facility::factory()->create(['site_id' => $site->id]);
        $theirs = Facility::factory()->create(['site_id' => $site->id]);
        $user = $this->userWithRole('SUPERVISOR', $site, [$mine]);

        $this->actingAs($user)->getJson('/api/v1/facilities')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', (string) $mine->id);

        // Out of scope must look identical to "not permitted" (docs/07 SC-05).
        $this->assertApiError(
            $this->actingAs($user)->getJson("/api/v1/facilities/{$theirs->id}"),
            'FACILITY_OUT_OF_SCOPE',
            403,
        );
    }

    public function test_a_site_scoped_user_cannot_create_a_facility_elsewhere(): void
    {
        $mine = Site::factory()->create();
        $elsewhere = Site::factory()->create();
        $user = $this->userWithRole('YARD_ADMIN', $mine);

        $response = $this->actingAs($user)->postJson('/api/v1/facilities', [
            'site_id' => $elsewhere->id,
            'code' => 'YD-X',
            'name' => 'Elsewhere',
            'type' => 'OPEN_YARD',
        ]);

        $this->assertApiError($response, 'FACILITY_OUT_OF_SCOPE', 403);
        $this->assertDatabaseMissing('facilities', ['code' => 'YD-X']);

        // The same request against their own site succeeds.
        $this->actingAs($user)->postJson('/api/v1/facilities', [
            'site_id' => $mine->id,
            'code' => 'YD-X',
            'name' => 'Mine',
            'type' => 'OPEN_YARD',
        ])->assertCreated();
    }

    public function test_list_avoids_n_plus_one_queries(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        Facility::factory()->count(10)->create();

        \DB::enableQueryLog();
        $this->actingAs($admin)->getJson('/api/v1/facilities')->assertOk();
        $queries = count(\DB::getQueryLog());
        \DB::disableQueryLog();

        // Pagination count + facilities + eager-loaded site + counts + auth lookups.
        $this->assertLessThan(15, $queries, "Expected eager loading; ran {$queries} queries.");
    }
}
