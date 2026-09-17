<?php

namespace App\Domain\Inventory;

use App\Models\Location;
use App\Models\Pallet;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Put-away (BRD §9.1, docs/05 §3.1).
 *
 * Validation order matters: the operator hears the most actionable problem
 * first, and the location is checked before the pallet so they learn a lane is
 * blocked before lifting anything.
 */
class PutAwayService
{
    public function __construct(
        private readonly InventoryLedger $ledger,
        private readonly TransactionRecorder $recorder,
        private readonly LocationValidator $locations,
        private readonly PalletResolver $pallets,
    ) {}

    /** @return array<string, mixed> */
    public function perform(string $locationBarcode, string $palletBarcode, array $options = []): array
    {
        $user = Auth::user();

        // Outside the transaction: cheap rejections that need no lock.
        $location = $this->locations->resolveByBarcode($locationBarcode);
        $this->locations->assertAcceptsInbound($location, $user);

        return DB::transaction(function () use ($location, $palletBarcode, $options) {
            $resolved = $this->pallets->resolve($palletBarcode);

            // Lock FIRST. Everything below is decided under the lock, so a second
            // operator on the same pallet waits here and then loses cleanly.
            $pallet = $this->ledger->lockPallet($resolved->id);

            $existing = $this->ledger->currentFor($pallet->id);
            if ($existing !== null) {
                $existing->loadMissing(['location', 'facility', 'zone']);
                throw new BusinessRuleException(
                    'PALLET_ALREADY_STORED',
                    'This pallet is already stored.',
                    409,
                    [
                        'location_code' => $existing->location->code,
                        'facility' => $existing->facility->name,
                        'zone' => $existing->zone?->name,
                        'stored_by' => $existing->last_action_by,
                        'stored_at' => $existing->stored_at?->toIso8601String(),
                    ],
                );
            }

            if ($pallet->lifecycle_status === 'DISPATCHED') {
                throw new BusinessRuleException(
                    'PALLET_ALREADY_DISPATCHED',
                    'This pallet has already been dispatched.',
                    409,
                    ['dispatched_at' => $pallet->dispatched_at?->toIso8601String()],
                );
            }

            if ($pallet->block_state === 'EXCEPTION') {
                throw new BusinessRuleException(
                    'PALLET_BLOCKED',
                    'This pallet is flagged as an exception and cannot be stored until a supervisor clears it.',
                    423,
                );
            }

            PalletStateMachine::assertTransition($pallet, 'STORED');
            $this->locations->assertCapacity($location, $this->ledger->occupancyOf($location->id));

            $previousStatus = $pallet->lifecycle_status;

            $txn = $this->recorder->record('PUTAWAY', $pallet, [
                'destination_location_id' => $location->id,
                'previous_lifecycle_status' => $previousStatus,
                'new_lifecycle_status' => 'STORED',
                'reason_code_id' => $options['reason_code_id'] ?? null,
                'remarks' => $options['remarks'] ?? null,
                'idempotency_key' => $options['idempotency_key'] ?? null,
            ]);

            $this->ledger->place($pallet, $location, $txn);

            $pallet->forceFill([
                'lifecycle_status' => 'STORED',
                'site_id' => $location->site_id,
                'first_putaway_at' => $pallet->first_putaway_at ?? now(),
                'last_movement_at' => now(),
                'last_action_by' => Auth::id(),
            ])->save();

            return ['transaction' => $txn, 'pallet' => $pallet->refresh(), 'location' => $location];
        });
    }
}
