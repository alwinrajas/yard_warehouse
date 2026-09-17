<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Location;
use App\Models\Site;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ZoneApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
    }

    public function test_creates_a_zone(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $facility = Facility::factory()->create();

        $this->actingAs($admin)->postJson('/api/v1/zones', [
            'facility_id' => $facility->id,
            'code' => 'ZONE-A',
            'name' => 'Zone A',
            'sequence' => 1,
        ])->assertCreated()->assertJsonPath('data.code', 'ZONE-A');

        $this->assertDatabaseHas('audit_logs', ['event' => 'zone.created']);
    }

    public function test_rejects_an_unknown_facility(): void
    {
        $response = $this->actingAs($this->userWithRole('SUPER_ADMIN'))->postJson('/api/v1/zones', [
            'facility_id' => 999999, 'code' => 'ZONE-A', 'name' => 'A',
        ]);

        $this->assertApiError($response, 'VALIDATION_FAILED', 422);
    }

    public function test_rejects_an_inactive_facility(): void
    {
        $facility = Facility::factory()->inactive()->create();

        $response = $this->actingAs($this->userWithRole('SUPER_ADMIN'))->postJson('/api/v1/zones', [
            'facility_id' => $facility->id, 'code' => 'ZONE-A', 'name' => 'A',
        ]);

        $this->assertApiError($response, 'PARENT_INACTIVE', 422);
    }

    public function test_zone_code_is_unique_within_a_facility_only(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $a = Facility::factory()->create();
        $b = Facility::factory()->create();
        Zone::factory()->create(['facility_id' => $a->id, 'code' => 'ZONE-A']);

        $this->assertApiError(
            $this->actingAs($admin)->postJson('/api/v1/zones', ['facility_id' => $a->id, 'code' => 'ZONE-A', 'name' => 'Dup']),
            'DUPLICATE_CODE',
            409,
        );

        $this->actingAs($admin)->postJson('/api/v1/zones', ['facility_id' => $b->id, 'code' => 'ZONE-A', 'name' => 'Other'])
            ->assertCreated();
    }

    public function test_refuses_to_move_a_zone_that_holds_locations(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $zone = Zone::factory()->create();
        Location::factory()->create([
            'facility_id' => $zone->facility_id,
            'zone_id' => $zone->id,
            'site_id' => $zone->facility->site_id,
        ]);
        $other = Facility::factory()->create();

        $response = $this->actingAs($admin)->putJson("/api/v1/zones/{$zone->id}", ['facility_id' => $other->id]);

        $this->assertApiError($response, 'ZONE_FACILITY_LOCKED', 409);
    }

    public function test_denies_creation_without_permission(): void
    {
        $response = $this->actingAs($this->userWithRole('VIEWER'))->postJson('/api/v1/zones', [
            'facility_id' => Facility::factory()->create()->id, 'code' => 'Z', 'name' => 'Z',
        ]);

        $this->assertApiError($response, 'PERMISSION_DENIED', 403);
    }

    public function test_filters_by_facility(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $a = Facility::factory()->create();
        $b = Facility::factory()->create();
        Zone::factory()->count(3)->create(['facility_id' => $a->id]);
        Zone::factory()->count(2)->create(['facility_id' => $b->id]);

        $this->actingAs($admin)->getJson("/api/v1/zones?facility_id={$a->id}")
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_zone_outside_facility_scope_is_refused(): void
    {
        $site = Site::factory()->create();
        $mine = Facility::factory()->create(['site_id' => $site->id]);
        $theirs = Facility::factory()->create(['site_id' => $site->id]);
        $zone = Zone::factory()->create(['facility_id' => $theirs->id]);
        $user = $this->userWithRole('SUPERVISOR', $site, [$mine]);

        $this->assertApiError(
            $this->actingAs($user)->getJson("/api/v1/zones/{$zone->id}"),
            'FACILITY_OUT_OF_SCOPE',
            403,
        );
    }
}
