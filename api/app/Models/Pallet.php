<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $pallet_key
 * @property string|null $job_number
 * @property string|null $pallet_number
 * @property string $raw_barcode_value
 * @property string $lifecycle_status
 * @property string $block_state
 * @property int|null $customer_id
 * @property string|null $customer_name_raw
 * @property string|null $lpo_number
 * @property int|null $site_id
 * @property Carbon|null $first_putaway_at
 * @property Carbon|null $last_movement_at
 * @property Carbon|null $dispatched_at
 * @property-read Customer|null $customer
 * @property-read InventoryCurrent|null $current
 * @property-read Collection<int, InventoryTransaction> $transactions
 * @property-read Collection<int, PalletHold> $holds
 * @property string $barcode_profile
 */
class Pallet extends Model
{
    use HasFactory;

    public const LIFECYCLE = [
        'AT_COLLECTION_POINT', 'STORED', 'IN_MOVEMENT', 'STAGED_FOR_DISPATCH', 'DISPATCHED',
    ];

    public const BLOCK_STATES = ['NONE', 'ON_HOLD', 'DAMAGED', 'EXCEPTION'];

    protected $fillable = [
        'pallet_key', 'job_number', 'pallet_number', 'raw_barcode_value', 'barcode_profile',
        'customer_id', 'customer_name_raw', 'lpo_number', 'lifecycle_status', 'block_state',
        'site_id', 'first_putaway_at', 'last_movement_at', 'last_action_by', 'dispatched_at',
    ];

    protected $attributes = ['lifecycle_status' => 'AT_COLLECTION_POINT', 'block_state' => 'NONE'];

    protected function casts(): array
    {
        return [
            'first_putaway_at' => 'datetime',
            'last_movement_at' => 'datetime',
            'dispatched_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function current(): HasOne
    {
        return $this->hasOne(InventoryCurrent::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    public function holds(): HasMany
    {
        return $this->hasMany(PalletHold::class);
    }

    /**
     * The single status users see. Block state wins when set, otherwise the
     * lifecycle status — so the BRD's seven names are reproduced exactly while
     * location and blocking stay independent internally (docs/05 §1).
     */
    public function displayStatus(): string
    {
        return $this->block_state === 'NONE' ? $this->lifecycle_status : $this->block_state;
    }

    public function isDispatchBlocked(): bool
    {
        return $this->block_state !== 'NONE';
    }
}
