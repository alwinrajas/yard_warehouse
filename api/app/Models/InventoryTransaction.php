<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * Append-only. UPDATED_AT is null because the table has no such column: a row
 * that can be modified is not a ledger entry (BR-06).
 *
 * @property int $id
 * @property string $txn_ref
 * @property string $type
 * @property int $pallet_id
 * @property int|null $source_location_id
 * @property int|null $destination_location_id
 * @property string $channel
 * @property Carbon $created_at
 * @property-read Pallet $pallet
 * @property-read User|null $user
 * @property-read Location|null $sourceLocation
 * @property-read Location|null $destinationLocation
 * @property-read ReasonCode|null $reasonCode
 * @property string|null $remarks
 * @property array|null $previous_values
 * @property array|null $new_values
 */
class InventoryTransaction extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'txn_ref', 'type', 'pallet_id', 'source_location_id', 'destination_location_id',
        'previous_lifecycle_status', 'new_lifecycle_status', 'previous_block_state', 'new_block_state',
        'previous_values', 'new_values', 'reason_code_id', 'remarks', 'user_id', 'device_id',
        'token_id', 'channel', 'idempotency_key', 'correction_of_transaction_id', 'correlation_id',
    ];

    protected function casts(): array
    {
        return ['previous_values' => 'array', 'new_values' => 'array', 'created_at' => 'datetime'];
    }

    public function pallet(): BelongsTo
    {
        return $this->belongsTo(Pallet::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sourceLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'source_location_id');
    }

    public function destinationLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'destination_location_id');
    }

    public function reasonCode(): BelongsTo
    {
        return $this->belongsTo(ReasonCode::class);
    }

    public function dispatchDetail(): HasOne
    {
        return $this->hasOne(DispatchTransactionDetail::class);
    }
}
