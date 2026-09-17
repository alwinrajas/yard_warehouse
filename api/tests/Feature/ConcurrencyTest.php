<?php

namespace Tests\Feature;

use App\Domain\Inventory\DispatchService;
use App\Domain\Inventory\InventoryLedger;
use App\Domain\Inventory\PutAwayService;
use App\Domain\Inventory\TransferService;
use App\Models\Facility;
use App\Models\InventoryCurrent;
use App\Models\InventoryTransaction;
use App\Models\Location;
use App\Models\LocationBarcode;
use App\Models\User;
use App\Support\BusinessRuleException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Concurrency (docs/14 §5, BR-02 / FR-013 / FR-020).
 *
 * The scenario the BRD cares about most: two operators acting on the same pallet
 * at the same moment. The first valid commit wins; the second fails safely and
 * is told the current truth.
 *
 * NOTE ON FIDELITY: PHPUnit runs single-threaded inside one transaction, so these
 * exercise the SERVICE-LEVEL guards (lock ordering, the existence checks under
 * the lock, and the database constraint) rather than true OS-level parallelism.
 * The invariant itself is enforced by `inventory_current.pallet_id` being the
 * PRIMARY KEY, which no interleaving can defeat — that is asserted directly in
 * test_the_primary_key_defeats_a_concurrent_insert. A parallel-process suite
 * against a live server is scheduled for the hardening increment (docs/13 I-15).
 */
class ConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    private Location $locationA;

    private Location $locationB;

    private User $operator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();

        $facility = Facility::factory()->create(['type' => 'OPEN_YARD']);
        $this->locationA = $this->makeLocation($facility, 'YD-A-01-001');
        $this->locationB = $this->makeLocation($facility, 'YD-A-01-002');
        $this->operator = $this->userWithRole('SUPERVISOR');

        Auth::login($this->operator);
    }

    private function makeLocation(Facility $facility, string $code): Location
    {
        $location = Location::factory()->create([
            'site_id' => $facility->site_id,
            'facility_id' => $facility->id,
            'code' => $code,
        ]);

        $barcode = new LocationBarcode(['location_id' => $location->id]);
        $barcode->barcode_value = 'BC-'.$code;
        $barcode->save();

        return $location;
    }

    /** TC-CONC-01 — two operators put the same pallet away simultaneously. */
    public function test_only_one_put_away_of_the_same_pallet_can_succeed(): void
    {
        $service = app(PutAwayService::class);

        $service->perform('BC-YD-A-01-001', 'PAL-100');

        try {
            $service->perform('BC-YD-A-01-002', 'PAL-100');
            $this->fail('The second put-away should have been rejected.');
        } catch (BusinessRuleException $e) {
            $this->assertSame('PALLET_ALREADY_STORED', $e->errorCode);
            // The loser is told where the pallet actually is.
            $this->assertSame('YD-A-01-001', $e->details['location_code']);
        }

        $this->assertSame(1, InventoryCurrent::count());
        $this->assertSame(1, InventoryTransaction::where('type', 'PUTAWAY')->count());
        app(InventoryLedger::class)->assertInvariant();
    }

    /** TC-CONC-02 — different pallets into the same location both succeed. */
    public function test_different_pallets_may_share_a_location(): void
    {
        $service = app(PutAwayService::class);

        $service->perform('BC-YD-A-01-001', 'PAL-101');
        $service->perform('BC-YD-A-01-001', 'PAL-102');

        $this->assertSame(2, InventoryCurrent::where('location_id', $this->locationA->id)->count());
        app(InventoryLedger::class)->assertInvariant();
    }

    /** TC-CONC-03 — the same pallet dispatched twice. */
    public function test_a_pallet_cannot_be_double_dispatched(): void
    {
        app(PutAwayService::class)->perform('BC-YD-A-01-001', 'PAL-103');
        $dispatch = app(DispatchService::class);

        $dispatch->perform('PAL-103', 'BC-YD-A-01-001');

        try {
            $dispatch->perform('PAL-103', 'BC-YD-A-01-001');
            $this->fail('The second dispatch should have been rejected.');
        } catch (BusinessRuleException $e) {
            $this->assertSame('PALLET_ALREADY_DISPATCHED', $e->errorCode);
        }

        $this->assertSame(1, InventoryTransaction::where('type', 'DISPATCH')->count());
        $this->assertSame(0, InventoryCurrent::count());
    }

    /** TC-CONC-04 — transfer and dispatch race on one pallet. */
    public function test_transfer_after_dispatch_is_refused(): void
    {
        app(PutAwayService::class)->perform('BC-YD-A-01-001', 'PAL-104');
        app(DispatchService::class)->perform('PAL-104', null);

        try {
            app(TransferService::class)->perform('PAL-104', null, 'BC-YD-A-01-002');
            $this->fail('A dispatched pallet cannot be transferred.');
        } catch (BusinessRuleException $e) {
            $this->assertSame('PALLET_NOT_IN_INVENTORY', $e->errorCode);
        }

        $this->assertSame(0, InventoryCurrent::count());
        app(InventoryLedger::class)->assertInvariant();
    }

    /** TC-CONC-05 — two transfers of one pallet to different destinations. */
    public function test_repeated_transfers_leave_exactly_one_current_location(): void
    {
        app(PutAwayService::class)->perform('BC-YD-A-01-001', 'PAL-105');
        $transfer = app(TransferService::class);

        $transfer->perform('PAL-105', 'BC-YD-A-01-001', 'BC-YD-A-01-002');
        $transfer->perform('PAL-105', 'BC-YD-A-01-002', 'BC-YD-A-01-001');

        $this->assertSame(1, InventoryCurrent::count());
        $this->assertSame($this->locationA->id, InventoryCurrent::first()->location_id);
        $this->assertSame(2, InventoryTransaction::where('type', 'TRANSFER')->count());
        app(InventoryLedger::class)->assertInvariant();
    }

    /**
     * The structural guarantee (DC-01).
     *
     * Even with the service layer bypassed entirely — which is what a genuine
     * race would amount to if the lock failed — the database refuses a second
     * active location for the same pallet.
     */
    public function test_the_primary_key_defeats_a_concurrent_insert(): void
    {
        app(PutAwayService::class)->perform('BC-YD-A-01-001', 'PAL-106');
        $row = InventoryCurrent::first();

        $threw = false;
        try {
            DB::table('inventory_current')->insert([
                'pallet_id' => $row->pallet_id,
                'location_id' => $this->locationB->id,
                'facility_id' => $this->locationB->facility_id,
                'site_id' => $this->locationB->site_id,
                'stored_at' => now(),
                'putaway_at' => now(),
            ]);
        } catch (QueryException) {
            $threw = true;
        }

        $this->assertTrue($threw, 'The database must reject a duplicate active location.');
        $this->assertSame(1, InventoryCurrent::count());
        app(InventoryLedger::class)->assertInvariant();
    }

    /** TC-CONC-10 — sustained interleaved activity leaves the ledger consistent. */
    public function test_the_invariant_survives_sustained_mixed_activity(): void
    {
        $putAway = app(PutAwayService::class);
        $transfer = app(TransferService::class);
        $dispatch = app(DispatchService::class);
        $ledger = app(InventoryLedger::class);

        for ($i = 0; $i < 20; $i++) {
            $code = "PAL-2{$i}";
            $putAway->perform('BC-YD-A-01-001', $code);

            if ($i % 2 === 0) {
                $transfer->perform($code, 'BC-YD-A-01-001', 'BC-YD-A-01-002');
            }
            if ($i % 5 === 0) {
                $dispatch->perform($code, null);
            }

            $ledger->assertInvariant();
        }

        $dispatched = InventoryTransaction::where('type', 'DISPATCH')->count();
        $this->assertSame(20 - $dispatched, InventoryCurrent::count());
        $this->assertSame(20, InventoryTransaction::where('type', 'PUTAWAY')->count());
    }

    /** Every transaction reference is unique, even under rapid succession (DC-07). */
    public function test_transaction_references_are_unique(): void
    {
        $putAway = app(PutAwayService::class);

        for ($i = 0; $i < 15; $i++) {
            $putAway->perform('BC-YD-A-01-001', "PAL-3{$i}");
        }

        $refs = InventoryTransaction::pluck('txn_ref');
        $this->assertCount(15, $refs);
        $this->assertCount(15, $refs->unique());
    }

    /** Every inventory-changing row carries an actor (BR-07). */
    public function test_every_transaction_records_who_did_it(): void
    {
        app(PutAwayService::class)->perform('BC-YD-A-01-001', 'PAL-400');
        app(TransferService::class)->perform('PAL-400', null, 'BC-YD-A-01-002');
        app(DispatchService::class)->perform('PAL-400', null);

        $this->assertSame(3, InventoryTransaction::count());
        $this->assertSame(0, InventoryTransaction::whereNull('user_id')->count());
        $this->assertSame(3, InventoryTransaction::where('user_id', $this->operator->id)->count());
    }
}
