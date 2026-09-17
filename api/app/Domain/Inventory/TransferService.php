<?php

namespace App\Domain\Inventory;

use App\Models\Location;
use App\Models\Pallet;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Location-to-location movement (BRD §9.2, docs/05 §3.2).
 *
 * Single atomic call by default (CFG-08 = SINGLE_STEP): source and destination
 * travel together, so an abandoned move simply leaves the pallet where it was
 * rather than stranding it in IN_MOVEMENT with no location.
 */
class TransferService
{
    public function __construct(
        private readonly InventoryLedger $ledger,
        private readonly TransactionRecorder $recorder,
        private readonly LocationValidator $locations,
        private readonly PalletResolver $pallets,
    ) {}

    /** @return array<string, mixed> */
    public function perform(string $palletBarcode, ?string $sourceBarcode, string $destinationBarcode, array $options = []): array
    {
        $user = Auth::user();
        $destination = $this->locations->resolveByBarcode($destinationBarcode);
        $this->locations->assertAcceptsInbound($destination, $user);

        return DB::transaction(function () use ($palletBarcode, $sourceBarcode, $destination, $options) {
            $resolved = $this->pallets->resolve($palletBarcode, false);
            $pallet = $this->ledger->lockPallet($resolved->id);

            $current = $this->ledger->currentFor($pallet->id);
            if ($current === null) {
                throw new BusinessRuleException(
                    'PALLET_NOT_IN_INVENTORY',
                    $pallet->lifecycle_status === 'DISPATCHED'
                        ? 'This pallet has been dispatched and is no longer in the yard.'
                        : 'This pallet is not currently stored anywhere.',
                    409,
                    ['status' => $pallet->displayStatus()],
                );
            }

            $current->loadMissing('location');

            // BR-04: the scanned source must be where the pallet actually is.
            if ($sourceBarcode !== null && $sourceBarcode !== '') {
                $source = $this->locations->resolveByBarcode($sourceBarcode);
                if ($source->id !== $current->location_id) {
                    throw new BusinessRuleException(
                        'SOURCE_LOCATION_MISMATCH',
                        'This pallet is not at the location you scanned.',
                        409,
                        ['expected' => $current->location->code, 'scanned' => $source->code],
                    );
                }
            }

            if ($current->location_id === $destination->id) {
                throw new BusinessRuleException(
                    'SAME_LOCATION',
                    'The destination is the same as the current location.',
                    422,
                );
            }

            // A held or damaged pallet may still be relocated — what a hold
            // prevents is the pallet leaving. An EXCEPTION blocks both.
            if ($pallet->block_state === 'EXCEPTION') {
                throw new BusinessRuleException(
                    'PALLET_BLOCKED',
                    'This pallet is flagged as an exception and cannot be moved until a supervisor clears it.',
                    423,
                );
            }

            $this->locations->assertCapacity($destination, $this->ledger->occupancyOf($destination->id));

            $from = $current->location;

            $txn = $this->recorder->record('TRANSFER', $pallet, [
                'source_location_id' => $from->id,
                'destination_location_id' => $destination->id,
                'previous_lifecycle_status' => $pallet->lifecycle_status,
                'new_lifecycle_status' => 'STORED',
                'reason_code_id' => $options['reason_code_id'] ?? null,
                'remarks' => $options['remarks'] ?? null,
                'idempotency_key' => $options['idempotency_key'] ?? null,
            ]);

            $this->ledger->move($current, $destination, $txn);

            $pallet->forceFill([
                'lifecycle_status' => 'STORED',
                'last_movement_at' => now(),
                'last_action_by' => Auth::id(),
            ])->save();

            return ['transaction' => $txn, 'pallet' => $pallet->refresh(), 'from' => $from, 'to' => $destination];
        });
    }
}
