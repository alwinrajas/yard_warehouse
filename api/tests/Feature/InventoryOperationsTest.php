<?php

namespace Tests\Feature;

use App\Domain\Inventory\InventoryLedger;
use App\Models\Facility;
use App\Models\InventoryCurrent;
use App\Models\InventoryTransaction;
use App\Models\Location;
use App\Models\LocationBarcode;
use App\Models\Pallet;
use App\Models\ReasonCode;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The inventory core (docs/14 §4, §5).
 *
 * These are the tests that matter most in the product: the one-pallet-one-location
 * invariant, and the rejections that keep it true.
 */
class InventoryOperationsTest extends TestCase
{
    use RefreshDatabase;

    private Location $locationA;

    private Location $locationB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();

        $facility = Facility::factory()->create(['type' => 'OPEN_YARD']);
        $zone = Zone::factory()->create(['facility_id' => $facility->id]);

        $this->locationA = $this->makeLocation($facility, $zone, 'YD-A-01-001');
        $this->locationB = $this->makeLocation($facility, $zone, 'YD-A-01-002');
    }

    private function makeLocation(Facility $facility, Zone $zone, string $code): Location
    {
        $location = Location::factory()->create([
            'site_id' => $facility->site_id,
            'facility_id' => $facility->id,
            'zone_id' => $zone->id,
            'code' => $code,
        ]);

        $barcode = new LocationBarcode(['location_id' => $location->id]);
        $barcode->barcode_value = 'BC-'.$code;
        $barcode->save();

        return $location;
    }

    private function operator(): User
    {
        return $this->userWithRole('SUPERVISOR');
    }

    private function putAway(string $pallet, ?Location $location = null, ?string $key = null)
    {
        $request = $this->withHeaders($key ? ['Idempotency-Key' => $key] : []);

        return $request->postJson('/api/v1/putaway', [
            'location_barcode' => 'BC-'.($location ?? $this->locationA)->code,
            'pallet_barcode' => $pallet,
        ]);
    }

    /* ------------------------------------------------------------ put-away */

    public function test_puts_a_pallet_away_and_makes_it_live_inventory(): void
    {
        $response = $this->actingAs($this->operator())->postJson('/api/v1/putaway', [
            'location_barcode' => 'BC-YD-A-01-001',
            'pallet_barcode' => 'PAL-10245',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.pallet.display_status', 'STORED')
            ->assertJsonPath('data.location.code', 'YD-A-01-001');

        $this->assertMatchesRegularExpression('/^PA-\d{8}-\d{6}$/', $response->json('data.transaction.txn_ref'));
        $this->assertSame(1, InventoryCurrent::count());
        $this->assertDatabaseHas('inventory_transactions', ['type' => 'PUTAWAY']);
    }

    public function test_rejects_a_second_put_away_and_names_the_current_location(): void
    {
        $operator = $this->operator();
        $this->actingAs($operator);
        $this->putAway('PAL-1')->assertCreated();

        $response = $this->putAway('PAL-1', $this->locationB);

        $this->assertApiError($response, 'PALLET_ALREADY_STORED', 409);
        // The conflict must carry the truth, or the operator cannot act on it.
        $response->assertJsonPath('error.details.location_code', 'YD-A-01-001');
        $this->assertSame(1, InventoryCurrent::count());
    }

    public function test_refuses_a_blocked_or_inactive_location(): void
    {
        $operator = $this->operator();
        $reason = ReasonCode::where('code', 'BLK_MAINTENANCE')->firstOrFail();

        $this->actingAs($operator)
            ->postJson("/api/v1/locations/{$this->locationA->id}/block", ['reason_code_id' => $reason->id])
            ->assertOk();

        $this->assertApiError($this->actingAs($operator)->postJson('/api/v1/putaway', [
            'location_barcode' => 'BC-YD-A-01-001', 'pallet_barcode' => 'PAL-2',
        ]), 'LOCATION_BLOCKED', 423);

        $this->locationB->forceFill(['is_active' => false])->save();
        $this->assertApiError($this->actingAs($operator)->postJson('/api/v1/putaway', [
            'location_barcode' => 'BC-YD-A-01-002', 'pallet_barcode' => 'PAL-2',
        ]), 'LOCATION_INACTIVE', 422);

        $this->assertSame(0, InventoryCurrent::count());
    }

    public function test_rejects_an_unknown_location_barcode(): void
    {
        $this->assertApiError(
            $this->actingAs($this->operator())->postJson('/api/v1/putaway', [
                'location_barcode' => 'NOT-A-LOCATION', 'pallet_barcode' => 'PAL-3',
            ]),
            'LOCATION_NOT_FOUND',
            404,
        );
    }

    /* ------------------------------------------------------------ transfer */

    public function test_transfers_a_pallet_and_leaves_exactly_one_current_location(): void
    {
        $operator = $this->operator();
        $this->actingAs($operator);
        $this->putAway('PAL-5')->assertCreated();

        $this->postJson('/api/v1/movements', [
            'pallet_barcode' => 'PAL-5',
            'source_barcode' => 'BC-YD-A-01-001',
            'destination_barcode' => 'BC-YD-A-01-002',
        ])->assertCreated()->assertJsonPath('data.to.code', 'YD-A-01-002');

        $rows = InventoryCurrent::all();
        $this->assertCount(1, $rows);
        $this->assertSame($this->locationB->id, $rows->first()->location_id);

        // The old location survives in history and nowhere in current inventory.
        $this->assertDatabaseHas('inventory_transactions', [
            'type' => 'TRANSFER',
            'source_location_id' => $this->locationA->id,
            'destination_location_id' => $this->locationB->id,
        ]);
    }

    public function test_transfer_preserves_the_ageing_basis(): void
    {
        $operator = $this->operator();
        $this->actingAs($operator);
        $this->putAway('PAL-6')->assertCreated();

        $original = InventoryCurrent::first();
        $original->forceFill(['putaway_at' => now()->subDays(10)])->save();

        $this->postJson('/api/v1/movements', [
            'pallet_barcode' => 'PAL-6', 'destination_barcode' => 'BC-YD-A-01-002',
        ])->assertCreated();

        // Ageing measures time in the yard; an internal move must not reset it.
        $this->assertSame(
            $original->putaway_at->toDateString(),
            InventoryCurrent::first()->putaway_at->toDateString(),
        );
    }

    public function test_rejects_a_source_mismatch_and_names_both_locations(): void
    {
        $operator = $this->operator();
        $this->actingAs($operator);
        $this->putAway('PAL-7')->assertCreated();

        $response = $this->postJson('/api/v1/movements', [
            'pallet_barcode' => 'PAL-7',
            'source_barcode' => 'BC-YD-A-01-002',
            'destination_barcode' => 'BC-YD-A-01-001',
        ]);

        $this->assertApiError($response, 'SOURCE_LOCATION_MISMATCH', 409);
        $response->assertJsonPath('error.details.expected', 'YD-A-01-001')
            ->assertJsonPath('error.details.scanned', 'YD-A-01-002');
    }

    public function test_rejects_a_move_to_the_same_location(): void
    {
        $this->actingAs($this->operator());
        $this->putAway('PAL-8')->assertCreated();

        $this->assertApiError($this->postJson('/api/v1/movements', [
            'pallet_barcode' => 'PAL-8', 'destination_barcode' => 'BC-YD-A-01-001',
        ]), 'SAME_LOCATION', 422);
    }

    /* ------------------------------------------------------------ dispatch */

    public function test_dispatch_removes_the_pallet_from_active_inventory_but_keeps_history(): void
    {
        $this->actingAs($this->operator());
        $this->putAway('PAL-9')->assertCreated();

        $this->postJson('/api/v1/dispatch', [
            'pallet_barcode' => 'PAL-9',
            'location_barcode' => 'BC-YD-A-01-001',
            'delivery_reference' => 'DO-5512',
        ])->assertCreated()->assertJsonPath('data.pallet.display_status', 'DISPATCHED');

        $this->assertSame(0, InventoryCurrent::count());
        $this->assertDatabaseHas('dispatch_transaction_details', ['delivery_reference' => 'DO-5512']);
        // Two ledger rows remain: the put-away and the dispatch.
        $this->assertSame(2, InventoryTransaction::count());
    }

    public function test_rejects_a_double_dispatch(): void
    {
        $this->actingAs($this->operator());
        $this->putAway('PAL-10')->assertCreated();
        $this->postJson('/api/v1/dispatch', ['pallet_barcode' => 'PAL-10'])->assertCreated();

        $this->assertApiError(
            $this->postJson('/api/v1/dispatch', ['pallet_barcode' => 'PAL-10']),
            'PALLET_ALREADY_DISPATCHED',
            409,
        );
    }

    public function test_rejects_the_wrong_location_at_dispatch(): void
    {
        $this->actingAs($this->operator());
        $this->putAway('PAL-11')->assertCreated();

        $response = $this->postJson('/api/v1/dispatch', [
            'pallet_barcode' => 'PAL-11', 'location_barcode' => 'BC-YD-A-01-002',
        ]);

        $this->assertApiError($response, 'PALLET_NOT_AT_LOCATION', 409);
        $response->assertJsonPath('error.details.expected', 'YD-A-01-001')
            ->assertJsonPath('error.details.scanned', 'YD-A-01-002');
        $this->assertSame(1, InventoryCurrent::count());
    }

    public function test_a_held_pallet_cannot_be_dispatched_but_can_still_be_moved(): void
    {
        $operator = $this->operator();
        $this->actingAs($operator);
        $this->putAway('PAL-12')->assertCreated();

        $pallet = Pallet::where('pallet_number', 'PAL-12')->firstOrFail();
        $reason = ReasonCode::factory()->create(['category' => 'HOLD', 'name' => 'Quality check']);

        $this->postJson('/api/v1/holds', [
            'pallet_id' => $pallet->id, 'hold_type' => 'HOLD',
            'reason_code_id' => $reason->id, 'remarks' => 'Awaiting QC',
        ])->assertCreated();

        $response = $this->postJson('/api/v1/dispatch', ['pallet_barcode' => 'PAL-12']);
        $this->assertApiError($response, 'PALLET_ON_HOLD', 423);
        $response->assertJsonPath('error.details.reason', 'Quality check');

        // A hold stops the pallet LEAVING, not being relocated.
        $this->postJson('/api/v1/movements', [
            'pallet_barcode' => 'PAL-12', 'destination_barcode' => 'BC-YD-A-01-002',
        ])->assertCreated();

        // Location survives the hold, and the hold survives the move.
        $this->assertSame('ON_HOLD', $pallet->refresh()->block_state);
        $this->assertSame('STORED', $pallet->lifecycle_status);
    }

    public function test_releasing_a_hold_restores_dispatch_eligibility(): void
    {
        $this->actingAs($this->operator());
        $this->putAway('PAL-13')->assertCreated();

        $pallet = Pallet::where('pallet_number', 'PAL-13')->firstOrFail();
        $reason = ReasonCode::factory()->create(['category' => 'HOLD']);

        $holdId = $this->postJson('/api/v1/holds', [
            'pallet_id' => $pallet->id, 'hold_type' => 'HOLD', 'reason_code_id' => $reason->id,
        ])->json('data.id');

        $this->postJson("/api/v1/holds/{$holdId}/release", ['remarks' => 'Cleared'])->assertOk();

        $this->assertSame('NONE', $pallet->refresh()->block_state);
        $this->postJson('/api/v1/dispatch', ['pallet_barcode' => 'PAL-13'])->assertCreated();
    }

    /* --------------------------------------------------------- idempotency */

    public function test_a_replayed_request_returns_the_original_result_not_an_error(): void
    {
        $this->actingAs($this->operator());

        $first = $this->putAway('PAL-20', null, 'idem-key-1')->assertCreated();
        $second = $this->putAway('PAL-20', null, 'idem-key-1');

        // The retry after a dropped connection must succeed, not conflict.
        $second->assertStatus(201)->assertHeader('Idempotency-Replayed', 'true');
        $this->assertSame(
            $first->json('data.transaction.txn_ref'),
            $second->json('data.transaction.txn_ref'),
        );
        $this->assertSame(1, InventoryTransaction::where('type', 'PUTAWAY')->count());
    }

    public function test_the_same_key_with_different_details_is_refused(): void
    {
        $this->actingAs($this->operator());
        $this->putAway('PAL-21', null, 'idem-key-2')->assertCreated();

        $this->assertApiError(
            $this->putAway('PAL-22', null, 'idem-key-2'),
            'IDEMPOTENCY_KEY_REUSED',
            422,
        );
    }

    /* ----------------------------------------------------------- invariant */

    public function test_the_database_cannot_represent_a_pallet_in_two_locations(): void
    {
        $this->actingAs($this->operator());
        $this->putAway('PAL-30')->assertCreated();

        $row = InventoryCurrent::first();

        // pallet_id is the PRIMARY KEY, so a second row is impossible even by
        // bypassing the service layer entirely (DC-01).
        $this->expectException(QueryException::class);
        InventoryCurrent::insert([
            'pallet_id' => $row->pallet_id,
            'location_id' => $this->locationB->id,
            'facility_id' => $this->locationB->facility_id,
            'site_id' => $this->locationB->site_id,
            'stored_at' => now(),
            'putaway_at' => now(),
        ]);
    }

    public function test_the_invariant_holds_after_a_full_lifecycle(): void
    {
        $this->actingAs($this->operator());
        $ledger = app(InventoryLedger::class);

        foreach (['PAL-40', 'PAL-41', 'PAL-42'] as $code) {
            $this->putAway($code)->assertCreated();
        }
        $this->postJson('/api/v1/movements', ['pallet_barcode' => 'PAL-41', 'destination_barcode' => 'BC-YD-A-01-002'])->assertCreated();
        $this->postJson('/api/v1/dispatch', ['pallet_barcode' => 'PAL-42'])->assertCreated();

        $ledger->assertInvariant();
        $this->assertSame(2, InventoryCurrent::count());
    }

    /* ------------------------------------------------------- authorisation */

    public function test_a_viewer_cannot_post_any_inventory_transaction(): void
    {
        $viewer = $this->userWithRole('VIEWER');

        foreach ([
            ['/api/v1/putaway', ['location_barcode' => 'BC-YD-A-01-001', 'pallet_barcode' => 'P']],
            ['/api/v1/movements', ['pallet_barcode' => 'P', 'destination_barcode' => 'BC-YD-A-01-001']],
            ['/api/v1/dispatch', ['pallet_barcode' => 'P']],
        ] as [$url, $payload]) {
            $this->assertApiError($this->actingAs($viewer)->postJson($url, $payload), 'PERMISSION_DENIED', 403);
        }

        $this->assertSame(0, InventoryCurrent::count());
    }

    public function test_a_supervisor_cannot_perform_corrections(): void
    {
        // docs/07 §3.4 — one of the four deliberate denials.
        $this->actingAs($this->operator());
        $this->putAway('PAL-50')->assertCreated();

        $txn = InventoryTransaction::first();

        $this->assertApiError($this->postJson('/api/v1/corrections', [
            'original_transaction_id' => $txn->id,
            'type' => 'PUTAWAY_LOCATION_CORRECTION',
            'reason_code_id' => 1,
            'justification' => 'Operator scanned the wrong lane entirely.',
            'location_id' => $this->locationB->id,
        ]), 'PERMISSION_DENIED', 403);
    }

    /* ------------------------------------------------------------ correction */

    public function test_a_correction_appends_and_never_rewrites_history(): void
    {
        $admin = $this->userWithRole('YARD_ADMIN');
        $this->actingAs($this->operator());
        $this->putAway('PAL-60')->assertCreated();

        $original = InventoryTransaction::first();
        $originalSnapshot = $original->toArray();

        $reason = ReasonCode::factory()->create(['category' => 'CORRECTION', 'name' => 'Operator scan error']);

        $this->actingAs($admin)->postJson('/api/v1/corrections', [
            'original_transaction_id' => $original->id,
            'type' => 'PUTAWAY_LOCATION_CORRECTION',
            'reason_code_id' => $reason->id,
            'justification' => 'Confirmed physically at lane 2, not lane 1.',
            'location_id' => $this->locationB->id,
        ])->assertCreated()->assertJsonPath('data.type', 'CORRECTION');

        // The original row is byte-identical; the correction is a new row.
        $this->assertSame($originalSnapshot, $original->refresh()->toArray());
        $this->assertSame(2, InventoryTransaction::count());
        $this->assertSame($this->locationB->id, InventoryCurrent::first()->location_id);

        $correction = InventoryTransaction::where('type', 'CORRECTION')->first();
        $this->assertSame($original->id, $correction->correction_of_transaction_id);
        $this->assertNotNull($correction->previous_values);
        $this->assertNotNull($correction->new_values);
    }

    public function test_a_correction_requires_a_real_justification(): void
    {
        $admin = $this->userWithRole('YARD_ADMIN');
        $this->actingAs($this->operator());
        $this->putAway('PAL-61')->assertCreated();
        $txn = InventoryTransaction::first();
        $reason = ReasonCode::factory()->create(['category' => 'CORRECTION']);

        $this->assertApiError($this->actingAs($admin)->postJson('/api/v1/corrections', [
            'original_transaction_id' => $txn->id,
            'type' => 'PUTAWAY_LOCATION_CORRECTION',
            'reason_code_id' => $reason->id,
            'justification' => 'oops',
            'location_id' => $this->locationB->id,
        ]), 'VALIDATION_FAILED', 422);
    }

    /* --------------------------------------------------------------- barcode */

    public function test_reprinting_a_location_barcode_never_changes_its_identity(): void
    {
        // LB-03 — the rule most easily broken by a careless implementation.
        $admin = $this->userWithRole('YARD_ADMIN');
        $barcode = LocationBarcode::where('location_id', $this->locationA->id)->firstOrFail();
        $valueBefore = $barcode->barcode_value;

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/location-barcodes/{$barcode->id}/reprint", ['reason' => 'Label damaged'])
            ->assertOk();

        $this->assertTrue($response->json('data.identity_preserved'));
        $this->assertSame($valueBefore, $barcode->refresh()->barcode_value);
        $this->assertSame(1, $barcode->reprint_count);
        $this->assertDatabaseHas('audit_logs', ['event' => 'barcode.reprinted']);
    }

    public function test_generating_a_barcode_twice_returns_the_same_identity(): void
    {
        $admin = $this->userWithRole('YARD_ADMIN');
        $fresh = Location::factory()->create([
            'site_id' => $this->locationA->site_id,
            'facility_id' => $this->locationA->facility_id,
            'code' => 'YD-A-09-999',
        ]);

        $first = $this->actingAs($admin)->postJson("/api/v1/location-barcodes/{$fresh->id}/generate")->json('data.barcode_value');
        $second = $this->actingAs($admin)->postJson("/api/v1/location-barcodes/{$fresh->id}/generate")->json('data.barcode_value');

        $this->assertSame($first, $second);
        $this->assertSame(1, LocationBarcode::where('location_id', $fresh->id)->count());
    }
}
