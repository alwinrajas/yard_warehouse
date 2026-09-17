<?php

namespace App\Domain\Inventory;

use App\Models\InventoryTransaction;
use App\Models\Pallet;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Append-only writer for the ledger (BR-06).
 *
 * There is intentionally no update() or delete() here, and none anywhere else.
 * A correction calls record() again with correction_of_transaction_id set.
 */
class TransactionRecorder
{
    private const PREFIX = [
        'PUTAWAY' => 'PA', 'TRANSFER' => 'TR', 'DISPATCH' => 'DP', 'STAGE' => 'SG',
        'HOLD' => 'HD', 'RELEASE' => 'RL', 'MARK_DAMAGED' => 'DM', 'FLAG_EXCEPTION' => 'EX',
        'CORRECTION' => 'CR', 'OPENING_STOCK' => 'OS',
    ];

    public function record(string $type, Pallet $pallet, array $attributes = []): InventoryTransaction
    {
        $request = request();

        return InventoryTransaction::create(array_merge([
            'txn_ref' => $this->nextReference($type),
            'type' => $type,
            'pallet_id' => $pallet->id,
            'user_id' => Auth::id(),
            'channel' => $attributes['channel'] ?? $this->detectChannel(),
            'device_id' => $attributes['device_id'] ?? $this->detectDevice(),
            'token_id' => $this->accessToken()?->getKey(),
            'correlation_id' => $request->attributes->get('correlation_id'),
        ], $attributes));
    }

    /**
     * Human-readable, unique, sortable: PA-20260916-000148.
     * The daily counter is derived under the caller's transaction, so two
     * concurrent posts cannot produce the same reference.
     */
    private function nextReference(string $type): string
    {
        $prefix = self::PREFIX[$type] ?? 'TX';
        $date = now()->format('Ymd');

        $sequence = DB::table('inventory_transactions')
            ->where('txn_ref', 'like', "{$prefix}-{$date}-%")
            ->lockForUpdate()
            ->count() + 1;

        return sprintf('%s-%s-%06d', $prefix, $date, $sequence);
    }

    /**
     * Only a real PersonalAccessToken carries device and channel. A session
     * authenticated another way (including actingAs in tests) yields a
     * TransientToken, which has none of those fields.
     */
    private function accessToken(): ?PersonalAccessToken
    {
        $token = Auth::user()?->currentAccessToken();

        return $token instanceof PersonalAccessToken ? $token : null;
    }

    private function detectChannel(): string
    {
        return $this->accessToken()?->channel ?? 'WEB';
    }

    private function detectDevice(): ?string
    {
        return $this->accessToken()?->device_id;
    }
}
