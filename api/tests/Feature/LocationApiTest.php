<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\InventoryCurrent;
use App\Models\Location;
use App\Models\Pallet;
use App\Models\ReasonCode;
use App\Models\Site;
use App\Models\Zone;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
    }

    public function test_creates_a_location_and_derives_the_site(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $facility = Facility::factory()->create();
        $zone = Zone::factory()->create(['facility_id' => $facility->id]);

        $response = $this->actingAs($admin)->postJson('/api/v1/locations', [
            'facility_id' => $facility->id,
            'zone_id' => $zone->id,
            'code' => 'YD-A-03-018',
            'location_type' => 'STORAGE',
        ]);

        $response->assertCreated()->assertJsonPath('data.code', 'YD-A-03-018');

        // site_id is denormalised from the facility, never supplied by the client.
        $this->assertDatabaseHas('locations', [
            'code' => 'YD-A-03-018',
            'site_id' => $facility->site_id,
            'zone_id' => $zone->id,
        ]);
    }

    public function test_rejects_a_zone_from_a_different_facility(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $facility = Facility::factory()->create();
        $otherZone = Zone::factory()->create();

        $response = $this->actingAs($admin)->postJson('/api/v1/locations', [
            'facility_id' => $facility->id,
            'zone_id' => $otherZone->id,
            'code' => 'X-1',
        ]);

        $this->assertApiError($response, 'ZONE_FACILITY_MISMATCH', 422);
        $response->assertJsonPath('error.message', 'The selected zone does not belong to the selected facility.');
        $this->assertDatabaseMissing('locations', ['code' => 'X-1']);
    }

    public function test_allows_a_location_without_a_zone(): void
    {
        $facility = Facility::factory()->create();

        $this->actingAs($this->userWithRole('SUPER_ADMIN'))->postJson('/api/v1/locations', [
            'facility_id' => $facility->id,
            'code' => 'NO-ZONE-1',
        ])->assertCreated()->assertJsonPath('data.zone_id', null);
    }

    public function test_rejects_an_unknown_facility(): void
    {
        $response = $this->actingAs($this->userWithRole('SUPER_ADMIN'))->postJson('/api/v1/locations', [
            'facility_id' => 999999, 'code' => 'X-2',
        ]);

        $this->assertApiError($response, 'VALIDATION_FAILED', 422);
    }

    public function test_rejects_an_inactive_facility_or_zone(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $inactiveFacility = Facility::factory()->inactive()->create();

        $this->assertApiError(
            $this->actingAs($admin)->postJson('/api/v1/locations', ['facility_id' => $inactiveFacility->id, 'code' => 'A-1']),
            'PARENT_INACTIVE',
            422,
        );

        $facility = Facility::factory()->create();
        $inactiveZone = Zone::factory()->inactive()->create(['facility_id' => $facility->id]);

        $this->assertApiError(
            $this->actingAs($admin)->postJson('/api/v1/locations', [
                'facility_id' => $facility->id, 'zone_id' => $inactiveZone->id, 'code' => 'A-2',
            ]),
            'PARENT_INACTIVE',
            422,
        );
    }

    public function test_location_code_is_unique_within_a_site(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();
        $a = Facility::factory()->create(['site_id' => $site->id]);
        $b = Facility::factory()->create(['site_id' => $site->id]);
        Location::factory()->create(['site_id' => $site->id, 'facility_id' => $a->id, 'code' => 'DUP-1']);

        // Same site, different facility — still a duplicate (DC-05).
        $this->assertApiError(
            $this->actingAs($admin)->postJson('/api/v1/locations', ['facility_id' => $b->id, 'code' => 'DUP-1']),
            'DUPLICATE_CODE',
            409,
        );

        // Different site — permitted.
        $elsewhere = Facility::factory()->create();
        $this->actingAs($admin)->postJson('/api/v1/locations', ['facility_id' => $elsewhere->id, 'code' => 'DUP-1'])
            ->assertCreated();
    }

    public function test_database_rejects_a_duplicate_code_even_bypassing_the_service(): void
    {
        $location = Location::factory()->create(['code' => 'HARD-1']);

        $this->expectException(QueryException::class);
        Location::query()->insert([
            'site_id' => $location->site_id,
            'facility_id' => $location->facility_id,
            'code' => 'HARD-1',
            'location_type' => 'STORAGE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_refuses_to_move_a_location_to_another_site(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $location = Location::factory()->create();
        $elsewhere = Facility::factory()->create();

        $response = $this->actingAs($admin)->putJson("/api/v1/locations/{$location->id}", [
            'facility_id' => $elsewhere->id,
        ]);

        $this->assertApiError($response, 'LOCATION_SITE_IMMUTABLE', 422);
    }

    public function test_blocks_and_unblocks_with_a_reason(): void
    {
        $supervisor = $this->userWithRole('SUPERVISOR');
        $location = Location::factory()->create();
        $reason = ReasonCode::where('code', 'BLK_MAINTENANCE')->firstOrFail();

        $this->actingAs($supervisor)->postJson("/api/v1/locations/{$location->id}/block", [
            'reason_code_id' => $reason->id,
            'remarks' => 'Crane overhead',
        ])->assertOk()
            ->assertJsonPath('data.is_blocked', true)
            ->assertJsonPath('data.state', 'blocked');

        $this->assertDatabaseHas('audit_logs', ['event' => 'location.blocked']);
        $this->assertFalse($location->refresh()->acceptsInbound());

        $this->actingAs($supervisor)->postJson("/api/v1/locations/{$location->id}/unblock")
            ->assertOk()
            ->assertJsonPath('data.is_blocked', false);

        $this->assertTrue($location->refresh()->acceptsInbound());
    }

    public function test_block_requires_a_valid_location_block_reason(): void
    {
        $supervisor = $this->userWithRole('SUPERVISOR');
        $location = Location::factory()->create();
        $wrongCategory = ReasonCode::factory()->create(['category' => 'HOLD']);

        $this->assertApiError(
            $this->actingAs($supervisor)->postJson("/api/v1/locations/{$location->id}/block", [
                'reason_code_id' => $wrongCategory->id,
            ]),
            'INVALID_REASON_CODE',
            422,
        );
    }

    public function test_block_requires_remarks_when_the_reason_demands_them(): void
    {
        $supervisor = $this->userWithRole('SUPERVISOR');
        $location = Location::factory()->create();
        $reason = ReasonCode::where('code', 'BLK_OTHER')->firstOrFail();

        $this->assertApiError(
            $this->actingAs($supervisor)->postJson("/api/v1/locations/{$location->id}/block", [
                'reason_code_id' => $reason->id,
            ]),
            'REMARKS_REQUIRED',
            422,
        );
    }

    public function test_an_inactive_location_does_not_accept_inbound(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $location = Location::factory()->create();

        $this->actingAs($admin)->postJson("/api/v1/locations/{$location->id}/status", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.state', 'inactive');

        $this->assertFalse($location->refresh()->acceptsInbound());
    }

    public function test_operator_cannot_create_or_block_locations(): void
    {
        $operator = $this->userWithRole('PDA_OPERATOR');
        $facility = Facility::factory()->create();
        $location = Location::factory()->create();

        $this->assertApiError(
            $this->actingAs($operator)->postJson('/api/v1/locations', ['facility_id' => $facility->id, 'code' => 'OP-1']),
            'PERMISSION_DENIED',
            403,
        );

        $this->assertApiError(
            $this->actingAs($operator)->postJson("/api/v1/locations/{$location->id}/block", ['reason_code_id' => 1]),
            'PERMISSION_DENIED',
            403,
        );
    }

    public function test_filters_paginates_and_sorts(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $facility = Facility::factory()->create();
        Location::factory()->count(6)->create(['facility_id' => $facility->id, 'site_id' => $facility->site_id]);
        Location::factory()->create(['facility_id' => $facility->id, 'site_id' => $facility->site_id, 'code' => 'AAA-1', 'is_active' => false]);

        $this->actingAs($admin)->getJson("/api/v1/locations?facility_id={$facility->id}&pageSize=3")
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.pagination.total', 7);

        $this->actingAs($admin)->getJson('/api/v1/locations?status=inactive')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'AAA-1');

        $this->actingAs($admin)->getJson('/api/v1/locations?sort=code&dir=asc')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'AAA-1');
    }

    public function test_list_avoids_n_plus_one_queries(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $facility = Facility::factory()->create();
        $zone = Zone::factory()->create(['facility_id' => $facility->id]);
        Location::factory()->count(20)->create([
            'facility_id' => $facility->id, 'zone_id' => $zone->id, 'site_id' => $facility->site_id,
        ]);

        \DB::enableQueryLog();
        $this->actingAs($admin)->getJson('/api/v1/locations')->assertOk();
        $queries = count(\DB::getQueryLog());
        \DB::disableQueryLog();

        $this->assertLessThan(15, $queries, "Expected eager loading; ran {$queries} queries.");
    }

    public function test_derived_state_reflects_occupancy_and_is_outranked_by_condition(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $facility = Facility::factory()->create();

        $empty = Location::factory()->create([
            'site_id' => $facility->site_id, 'facility_id' => $facility->id,
            'code' => 'ST-01', 'capacity' => 2,
        ]);
        $partial = Location::factory()->create([
            'site_id' => $facility->site_id, 'facility_id' => $facility->id,
            'code' => 'ST-02', 'capacity' => 2,
        ]);
        $full = Location::factory()->create([
            'site_id' => $facility->site_id, 'facility_id' => $facility->id,
            'code' => 'ST-03', 'capacity' => 1,
        ]);
        $blockedButOccupied = Location::factory()->create([
            'site_id' => $facility->site_id, 'facility_id' => $facility->id,
            'code' => 'ST-04', 'capacity' => 2, 'is_blocked' => true,
        ]);

        $this->place($partial, 1);
        $this->place($full, 1);
        $this->place($blockedButOccupied, 1);

        $states = collect(
            $this->actingAs($admin)->getJson('/api/v1/locations?pageSize=200')->assertOk()->json('data')
        )->pluck('state', 'code');

        $this->assertSame('empty', $states[$empty->code]);
        $this->assertSame('occupied', $states[$partial->code]);
        $this->assertSame('full', $states[$full->code]);
        // Unusable outranks occupancy: the operator needs the blocker first.
        $this->assertSame('blocked', $states[$blockedButOccupied->code]);

        $counts = collect(
            $this->actingAs($admin)->getJson('/api/v1/locations?pageSize=200')->json('data')
        )->pluck('occupied_count', 'code');

        $this->assertSame(0, $counts[$empty->code]);
        $this->assertSame(1, $counts[$partial->code]);
    }

    /** Writes inventory rows directly: this test is about projection, not put-away. */
    private function place(Location $location, int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $pallet = Pallet::create([
                'pallet_key' => 'K-'.$location->code.'-'.$i,
                'pallet_number' => 'P-'.$location->code.'-'.$i,
                'raw_barcode_value' => 'BC-'.$location->code.'-'.$i,
                'barcode_profile' => 'RAW',
                'site_id' => $location->site_id,
                'lifecycle_status' => 'STORED',
            ]);

            InventoryCurrent::create([
                'pallet_id' => $pallet->id,
                'location_id' => $location->id,
                'facility_id' => $location->facility_id,
                'zone_id' => $location->zone_id,
                'site_id' => $location->site_id,
                'putaway_at' => now(),
                'stored_at' => now(),
            ]);
        }
    }
}
