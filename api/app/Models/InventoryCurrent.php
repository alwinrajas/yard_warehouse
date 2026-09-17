<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * The invariant row: one pallet, at most one active location (BR-01 / FR-007).
 *
 * Only InventoryLedger may write this table. An architecture test fails the build
 * if any other class touches it.
 *
 * @property int $pallet_id
 * @property int $location_id
 * @property int $facility_id
 * @property int $site_id
 * @property int|null $zone_id
 * @property Carbon $stored_at
 * @property Carbon $putaway_at
 */
class InventoryCurrent extends Model
{
    protected $table = 'inventory_current';

    protected $primaryKey = 'pallet_id';

    public $incrementing = false;

    public const CREATED_AT = null;

    protected $fillable = [
        'pallet_id', 'location_id', 'zone_id', 'facility_id', 'site_id',
        'stored_at', 'putaway_at', 'last_transaction_id', 'last_action_by',
    ];

    protected function casts(): array
    {
        return ['stored_at' => 'datetime', 'putaway_at' => 'datetime'];
    }

    public function pallet(): BelongsTo
    {
        return $this->belongsTo(Pallet::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function lastActionBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_action_by');
    }
}
