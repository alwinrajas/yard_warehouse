<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $pallet_id
 * @property string $hold_type
 * @property bool $is_open
 * @property Carbon $placed_at
 * @property Carbon|null $released_at
 * @property-read Pallet $pallet
 * @property-read ReasonCode|null $reasonCode
 * @property-read User|null $placedBy
 * @property string|null $remarks
 * @property string|null $release_remarks
 */
class PalletHold extends Model
{
    use HasFactory;

    protected $fillable = [
        'pallet_id', 'hold_type', 'reason_code_id', 'remarks', 'placed_by', 'placed_at',
        'placed_transaction_id', 'released_by', 'released_at', 'release_reason_code_id',
        'release_remarks', 'released_transaction_id', 'is_open',
    ];

    protected $attributes = ['is_open' => true];

    protected function casts(): array
    {
        return ['is_open' => 'boolean', 'placed_at' => 'datetime', 'released_at' => 'datetime'];
    }

    public function pallet(): BelongsTo
    {
        return $this->belongsTo(Pallet::class);
    }

    public function reasonCode(): BelongsTo
    {
        return $this->belongsTo(ReasonCode::class);
    }

    public function placedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'placed_by');
    }
}
