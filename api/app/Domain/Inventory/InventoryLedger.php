<?php

namespace App\Domain\Inventory;

use App\Models\InventoryCurrent;
use App\Models\InventoryTransaction;
use App\Models\Location;
use App\Models\Pallet;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * The ONLY class permitted to write `inventory_current`.
 *
 * Everything that changes where a pallet is goes through here, inside a
 * transaction, with the pallet row already locked. That is what makes BR-01
 * enforceable rather than merely documented.
 */
class InventoryLedger
{
    /**
     * Locks the pallet row for the rest of the transaction.
     *
     * Taken FIRST, before any validation read, so two operators acting on the
     * same pallet serialise here rather than both passing validation (CC-02).
     * Lock order is fixed — pallet, then locations by ascending id — so no cycle
     * can form (CC-03).
     */
    public function lockPallet(int $palletId): Pallet
    {
        $pallet = Pallet::whereKey($palletId)->lockForUpdate()->first();

        if ($pallet === null) {
            throw new BusinessRuleException('PALLET_NOT_FOUND', 'No pallet is recorded with that reference.', 404);
        }

        return $pallet;
    }

    public function currentFor(int $palletId): ?InventoryCurrent
    {
        return InventoryCurrent::whereKey($palletId)->first();
    }

    public function place(Pallet $pallet, Location $location, InventoryTransaction $txn, ?\DateTimeInterface $putawayAt = null): InventoryCurrent
    {
        return InventoryCurrent::create([
            'pallet_id' => $pallet->id,
            'location_id' => $location->id,
            'zone_id' => $location->zone_id,
            'facility_id' => $location->facility_id,
            'site_id' => $location->site_id,
            'stored_at' => now(),
            'putaway_at' => $putawayAt ?? now(),
            'last_transaction_id' => $txn->id,
            'last_action_by' => Auth::id(),
        ]);
    }

    /**
     * Moves a pallet. The old location is released by this same UPDATE, so there
     * is never a window in which two rows exist — there is only ever one row.
     *
     * `putaway_at` is deliberately NOT touched: ageing measures how long stock
     * has been in the yard, which an internal relocation does not reset.
     */
    public function move(InventoryCurrent $current, Location $destination, InventoryTransaction $txn): InventoryCurrent
    {
        $current->update([
            'location_id' => $destination->id,
            'zone_id' => $destination->zone_id,
            'facility_id' => $destination->facility_id,
            'site_id' => $destination->site_id,
            'stored_at' => now(),
            'last_transaction_id' => $txn->id,
            'last_action_by' => Auth::id(),
        ]);

        return $current->refresh();
    }

    /** Removes the pallet from active inventory (FR-012). History is untouched. */
    public function remove(InventoryCurrent $current): void
    {
        $current->delete();
    }

    /** Pallet count currently at a location — used for capacity checks. */
    public function occupancyOf(int $locationId): int
    {
        return InventoryCurrent::where('location_id', $locationId)->count();
    }

    /**
     * Sanity assertion used by the concurrency tests. It cannot fail while
     * pallet_id is the primary key; it exists so that if anyone ever changes
     * that key, the failure is immediate and unmissable.
     */
    public function assertInvariant(): void
    {
        $violations = DB::table('inventory_current')
            ->select('pallet_id')
            ->groupBy('pallet_id')
            ->havingRaw('COUNT(*) > 1')
            ->count();

        if ($violations > 0) {
            throw new \RuntimeException("INVARIANT VIOLATED: {$violations} pallets hold more than one active location.");
        }
    }
}
