<?php

namespace App\Domain\Inventory;

use App\Models\DispatchTransactionDetail;
use App\Models\Pallet;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Dispatch (BRD §9.3, docs/05 §3.3).
 *
 * Removes the pallet from active inventory by DELETING its inventory_current
 * row (FR-012) — not by setting a flag every report would have to remember to
 * filter on. The full history remains in the ledger.
 */
class DispatchService
{
    public function __construct(
        private readonly InventoryLedger $ledger,
        private readonly TransactionRecorder $recorder,
        private readonly LocationValidator $locations,
        private readonly PalletResolver $pallets,
    ) {}

    /** @return array<string, mixed> */
    public function perform(string $palletBarcode, ?string $locationBarcode, array $options = []): array
    {
        return DB::transaction(function () use ($palletBarcode, $locationBarcode, $options) {
            $resolved = $this->pallets->resolve($palletBarcode, false);
            $pallet = $this->ledger->lockPallet($resolved->id);

            if ($pallet->lifecycle_status === 'DISPATCHED') {
                throw new BusinessRuleException(
                    'PALLET_ALREADY_DISPATCHED',
                    'This pallet has already been dispatched.',
                    409,
                    ['dispatched_at' => $pallet->dispatched_at?->toIso8601String()],
                );
            }

            $current = $this->ledger->currentFor($pallet->id);
            if ($current === null) {
                throw new BusinessRuleException(
                    'PALLET_NOT_IN_INVENTORY',
                    'This pallet is not currently stored anywhere.',
                    409,
                );
            }

            $current->loadMissing('location');

            if ($locationBarcode !== null && $locationBarcode !== '') {
                $scanned = $this->locations->resolveByBarcode($locationBarcode);
                if ($scanned->id !== $current->location_id) {
                    // The wrong-location message names both values, so the
                    // operator can correct it without calling anyone (BRD §21 B).
                    throw new BusinessRuleException(
                        'PALLET_NOT_AT_LOCATION',
                        'This pallet is not at the location you scanned.',
                        409,
                        ['expected' => $current->location->code, 'scanned' => $scanned->code],
                    );
                }
            }

            if ($pallet->isDispatchBlocked()) {
                $override = (bool) ($options['override_hold'] ?? false);
                $user = Auth::user();

                if (! $override || ! $user->hasPermission('dispatch.override_hold')) {
                    $hold = $pallet->holds()->where('is_open', true)->with('reasonCode')->first();
                    throw new BusinessRuleException(
                        'PALLET_ON_HOLD',
                        'This pallet is on hold and cannot be dispatched.',
                        423,
                        [
                            'block_state' => $pallet->block_state,
                            'reason' => $hold?->reasonCode?->name,
                            'remarks' => $hold?->remarks,
                            'placed_at' => $hold?->placed_at?->toIso8601String(),
                        ],
                    );
                }

                // BRD §21: manual overrides are restricted AND audited.
                AuditLogger::record('override.used', $pallet, [], [], [
                    'action' => 'dispatch_held_pallet',
                    'block_state' => $pallet->block_state,
                    'justification' => $options['override_justification'] ?? null,
                ]);
            }

            if (config('alutrack.dispatch_mode', 'DIRECT') === 'STAGED' && $pallet->lifecycle_status !== 'STAGED_FOR_DISPATCH') {
                throw new BusinessRuleException(
                    'STAGING_REQUIRED',
                    'This pallet must be staged for dispatch before it can leave.',
                    422,
                );
            }

            PalletStateMachine::assertTransition($pallet, 'DISPATCHED');

            $txn = $this->recorder->record('DISPATCH', $pallet, [
                'source_location_id' => $current->location_id,
                'previous_lifecycle_status' => $pallet->lifecycle_status,
                'new_lifecycle_status' => 'DISPATCHED',
                'reason_code_id' => $options['reason_code_id'] ?? null,
                'remarks' => $options['remarks'] ?? null,
                'idempotency_key' => $options['idempotency_key'] ?? null,
            ]);

            DispatchTransactionDetail::create([
                'inventory_transaction_id' => $txn->id,
                'delivery_reference' => $options['delivery_reference'] ?? null,
                'vehicle_reference' => $options['vehicle_reference'] ?? null,
                'dispatched_from_location_id' => $current->location_id,
                'customer_id' => $pallet->customer_id,
                'lpo_number' => $pallet->lpo_number,
                'remarks' => $options['remarks'] ?? null,
            ]);

            $this->ledger->remove($current);

            $pallet->forceFill([
                'lifecycle_status' => 'DISPATCHED',
                'dispatched_at' => now(),
                'last_movement_at' => now(),
                'last_action_by' => Auth::id(),
            ])->save();

            return ['transaction' => $txn, 'pallet' => $pallet->refresh()];
        });
    }

    /** Optional staging step (CFG-09 = STAGED). */
    public function stage(string $palletBarcode, string $stagingBarcode, array $options = []): array
    {
        $user = Auth::user();
        $staging = $this->locations->resolveByBarcode($stagingBarcode);
        $this->locations->assertAcceptsInbound($staging, $user, false);

        return DB::transaction(function () use ($palletBarcode, $staging, $options) {
            $resolved = $this->pallets->resolve($palletBarcode, false);
            $pallet = $this->ledger->lockPallet($resolved->id);
            $current = $this->ledger->currentFor($pallet->id);

            if ($current === null) {
                throw new BusinessRuleException('PALLET_NOT_IN_INVENTORY', 'This pallet is not currently stored anywhere.', 409);
            }

            PalletStateMachine::assertTransition($pallet, 'STAGED_FOR_DISPATCH');

            $txn = $this->recorder->record('STAGE', $pallet, [
                'source_location_id' => $current->location_id,
                'destination_location_id' => $staging->id,
                'previous_lifecycle_status' => $pallet->lifecycle_status,
                'new_lifecycle_status' => 'STAGED_FOR_DISPATCH',
                'idempotency_key' => $options['idempotency_key'] ?? null,
            ]);

            $this->ledger->move($current, $staging, $txn);
            $pallet->forceFill(['lifecycle_status' => 'STAGED_FOR_DISPATCH', 'last_movement_at' => now()])->save();

            return ['transaction' => $txn, 'pallet' => $pallet->refresh()];
        });
    }
}
