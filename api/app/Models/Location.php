<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $site_id
 * @property int $facility_id
 * @property int|null $zone_id
 * @property string $code
 * @property string|null $description
 * @property string $location_type
 * @property int|null $capacity
 * @property int $sequence
 * @property bool $is_active
 * @property bool $is_blocked
 * @property int|null $blocked_reason_id
 * @property string|null $blocked_remarks
 * @property Carbon|null $blocked_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Site $site
 * @property-read Facility $facility
 * @property-read Zone|null $zone
 * @property-read ReasonCode|null $blockedReason
 * @property-read LocationBarcode|null $barcode
 * @property int|null $pallet_count withCount() aggregate
 * @property string|null $oldest_putaway_at withMin() aggregate
 */
class Location extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPES = ['STORAGE', 'STAGING', 'COLLECTION', 'DISPATCH'];

    protected $fillable = [
        'site_id', 'facility_id', 'zone_id', 'code', 'description', 'location_type',
        'capacity', 'sequence', 'is_active', 'created_by', 'updated_by',
    ];

    protected $attributes = [
        'is_active' => true,
        'is_blocked' => false,
        'location_type' => 'STORAGE',
        'sequence' => 0,
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_blocked' => 'boolean',
            'capacity' => 'integer',
            'sequence' => 'integer',
            'blocked_at' => 'datetime',
        ];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function barcode(): HasOne
    {
        return $this->hasOne(LocationBarcode::class);
    }

    /** Pallets currently recorded here. Named to avoid colliding with future stock relations. */
    public function locationInventory(): HasMany
    {
        return $this->hasMany(InventoryCurrent::class, 'location_id');
    }

    public function blockedReason(): BelongsTo
    {
        return $this->belongsTo(ReasonCode::class, 'blocked_reason_id');
    }

    /**
     * Whether the location may receive inbound movement.
     *
     * Enforced here and re-checked in the put-away and transfer services when
     * they arrive (BR-03). The UI mirrors it for guidance only.
     */
    public function acceptsInbound(): bool
    {
        return $this->is_active && ! $this->is_blocked;
    }
}
