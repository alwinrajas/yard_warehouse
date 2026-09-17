<?php

namespace App\Domain\Inventory;

use App\Models\Pallet;
use App\Models\PalletHold;
use App\Models\ReasonCode;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Hold / damaged / exception (BRD §13, docs/05 §3.4).
 *
 * Sets block_state WITHOUT disturbing lifecycle_status or location, so a held
 * pallet keeps its place in location stock and release has a state to return to.
 */
class HoldService
{
    private const TYPE_TO_STATE = ['HOLD' => 'ON_HOLD', 'DAMAGED' => 'DAMAGED', 'EXCEPTION' => 'EXCEPTION'];

    private const TYPE_TO_TXN = ['HOLD' => 'HOLD', 'DAMAGED' => 'MARK_DAMAGED', 'EXCEPTION' => 'FLAG_EXCEPTION'];

    public function __construct(
        private readonly InventoryLedger $ledger,
        private readonly TransactionRecorder $recorder,
    ) {}

    public function place(int $palletId, string $holdType, int $reasonCodeId, ?string $remarks): PalletHold
    {
        if (! isset(self::TYPE_TO_STATE[$holdType])) {
            throw new BusinessRuleException('INVALID_HOLD_TYPE', 'Choose Hold, Damaged or Exception.', 422);
        }

        return DB::transaction(function () use ($palletId, $holdType, $reasonCodeId, $remarks) {
            $pallet = $this->ledger->lockPallet($palletId);

            if ($pallet->lifecycle_status === 'DISPATCHED') {
                // Holding something that has left the premises is meaningless and
                // would leave a pallet reported as blocked forever.
                throw new BusinessRuleException(
                    'PALLET_ALREADY_DISPATCHED',
                    'This pallet has been dispatched and can no longer be held.',
                    409,
                );
            }

            if ($pallet->block_state !== 'NONE') {
                throw new BusinessRuleException(
                    'PALLET_ALREADY_HELD',
                    'This pallet is already blocked. Release the existing hold first.',
                    409,
                    ['block_state' => $pallet->block_state],
                );
            }

            $reason = ReasonCode::find($reasonCodeId);
            if ($reason === null || ! $reason->is_active || ! in_array($reason->category, ['HOLD', 'DAMAGE', 'OTHER'], true)) {
                throw new BusinessRuleException('INVALID_REASON_CODE', 'Select an active hold reason.', 422);
            }

            if ($reason->requires_remarks && blank($remarks)) {
                throw new BusinessRuleException('REMARKS_REQUIRED', 'This reason requires remarks.', 422);
            }

            $newState = self::TYPE_TO_STATE[$holdType];

            $txn = $this->recorder->record(self::TYPE_TO_TXN[$holdType], $pallet, [
                'previous_block_state' => $pallet->block_state,
                'new_block_state' => $newState,
                'reason_code_id' => $reason->id,
                'remarks' => $remarks,
            ]);

            $hold = PalletHold::create([
                'pallet_id' => $pallet->id,
                'hold_type' => $holdType,
                'reason_code_id' => $reason->id,
                'remarks' => $remarks,
                'placed_by' => Auth::id(),
                'placed_at' => now(),
                'placed_transaction_id' => $txn->id,
                'is_open' => true,
            ]);

            $pallet->forceFill(['block_state' => $newState, 'last_action_by' => Auth::id()])->save();

            return $hold;
        });
    }

    public function release(int $holdId, ?int $reasonCodeId, ?string $remarks): PalletHold
    {
        return DB::transaction(function () use ($holdId, $reasonCodeId, $remarks) {
            $hold = PalletHold::whereKey($holdId)->lockForUpdate()->first();

            if ($hold === null || ! $hold->is_open) {
                throw new BusinessRuleException('HOLD_NOT_OPEN', 'That hold has already been released.', 409);
            }

            $pallet = $this->ledger->lockPallet($hold->pallet_id);

            $txn = $this->recorder->record('RELEASE', $pallet, [
                'previous_block_state' => $pallet->block_state,
                'new_block_state' => 'NONE',
                'reason_code_id' => $reasonCodeId,
                'remarks' => $remarks,
            ]);

            $hold->forceFill([
                'is_open' => false,
                'released_by' => Auth::id(),
                'released_at' => now(),
                'release_reason_code_id' => $reasonCodeId,
                'release_remarks' => $remarks,
                'released_transaction_id' => $txn->id,
            ])->save();

            $pallet->forceFill(['block_state' => 'NONE', 'last_action_by' => Auth::id()])->save();

            return $hold->refresh();
        });
    }
}
