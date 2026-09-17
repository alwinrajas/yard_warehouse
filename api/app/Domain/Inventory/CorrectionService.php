<?php

namespace App\Domain\Inventory;

use App\Models\InventoryTransaction;
use App\Models\Location;
use App\Models\ReasonCode;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Controlled correction / reversal (BRD §11.5, docs/05 §3.6).
 *
 * The ONLY sanctioned way to change a completed transaction. It never updates a
 * historical row — it appends a new one carrying before/after values and a link
 * to what it corrected. There is no code path here that writes to an existing
 * ledger entry, and none anywhere else.
 */
class CorrectionService
{
    public const TYPES = [
        'PUTAWAY_LOCATION_CORRECTION', 'TRANSFER_REVERSAL', 'DISPATCH_REVERSAL',
        'STATUS_CORRECTION', 'MANUAL_RELOCATION',
    ];

    public function __construct(
        private readonly InventoryLedger $ledger,
        private readonly TransactionRecorder $recorder,
        private readonly LocationValidator $locations,
    ) {}

    public function perform(array $input): InventoryTransaction
    {
        if (! in_array($input['type'], self::TYPES, true)) {
            throw new BusinessRuleException('INVALID_CORRECTION_TYPE', 'Choose a valid correction type.', 422);
        }

        if (mb_strlen(trim($input['justification'] ?? '')) < 10) {
            throw new BusinessRuleException(
                'JUSTIFICATION_REQUIRED',
                'Describe why this correction is necessary — at least 10 characters.',
                422,
            );
        }

        $reason = ReasonCode::find($input['reason_code_id'] ?? 0);
        if ($reason === null || $reason->category !== 'CORRECTION' || ! $reason->is_active) {
            throw new BusinessRuleException('INVALID_REASON_CODE', 'Select an active correction reason.', 422);
        }

        $original = InventoryTransaction::findOrFail($input['original_transaction_id']);

        return DB::transaction(function () use ($input, $original, $reason) {
            $pallet = $this->ledger->lockPallet($original->pallet_id);
            $current = $this->ledger->currentFor($pallet->id);

            $before = [
                'lifecycle_status' => $pallet->lifecycle_status,
                'block_state' => $pallet->block_state,
                'location_id' => $current?->location_id,
            ];

            $destination = null;
            $newStatus = $pallet->lifecycle_status;

            switch ($input['type']) {
                case 'DISPATCH_REVERSAL':
                    if ($pallet->lifecycle_status !== 'DISPATCHED') {
                        throw new BusinessRuleException('NOT_DISPATCHED', 'This pallet is not dispatched, so there is nothing to reverse.', 422);
                    }
                    $destination = Location::findOrFail($input['location_id']);
                    $newStatus = 'STORED';
                    break;

                case 'PUTAWAY_LOCATION_CORRECTION':
                case 'TRANSFER_REVERSAL':
                case 'MANUAL_RELOCATION':
                    if ($current === null) {
                        throw new BusinessRuleException('PALLET_NOT_IN_INVENTORY', 'This pallet is not currently in inventory.', 422);
                    }
                    $destination = Location::findOrFail($input['location_id']);
                    $newStatus = 'STORED';
                    break;

                case 'STATUS_CORRECTION':
                    $newStatus = $input['lifecycle_status'] ?? $pallet->lifecycle_status;
                    break;
            }

            if ($destination !== null) {
                $this->locations->assertAcceptsInbound($destination, Auth::user());
            }

            $after = [
                'lifecycle_status' => $newStatus,
                'block_state' => $input['block_state'] ?? $pallet->block_state,
                'location_id' => $destination?->id ?? $current?->location_id,
            ];

            $txn = $this->recorder->record('CORRECTION', $pallet, [
                'source_location_id' => $current?->location_id,
                'destination_location_id' => $destination?->id,
                'previous_lifecycle_status' => $before['lifecycle_status'],
                'new_lifecycle_status' => $after['lifecycle_status'],
                'previous_block_state' => $before['block_state'],
                'new_block_state' => $after['block_state'],
                'previous_values' => $before,
                'new_values' => $after + ['correction_type' => $input['type']],
                'reason_code_id' => $reason->id,
                'remarks' => $input['justification'],
                'correction_of_transaction_id' => $original->id,
            ]);

            if ($destination !== null) {
                if ($current === null) {
                    $this->ledger->place($pallet, $destination, $txn, $pallet->first_putaway_at);
                } else {
                    $this->ledger->move($current, $destination, $txn);
                }
            }

            $pallet->forceFill([
                'lifecycle_status' => $after['lifecycle_status'],
                'block_state' => $after['block_state'],
                'dispatched_at' => $after['lifecycle_status'] === 'DISPATCHED' ? $pallet->dispatched_at : null,
                'last_movement_at' => now(),
                'last_action_by' => Auth::id(),
            ])->save();

            AuditLogger::record('correction.performed', $pallet, $before, $after, [
                'original_txn' => $original->txn_ref,
                'correction_txn' => $txn->txn_ref,
                'justification' => $input['justification'],
            ]);

            // The original row is deliberately untouched.
            return $txn;
        });
    }
}
