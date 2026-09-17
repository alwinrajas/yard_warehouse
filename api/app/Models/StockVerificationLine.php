<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $outcome
 * @property-read Pallet|null $pallet
 * @property-read Location|null $systemLocation
 * @property bool $expected
 * @property bool $scanned
 * @property int|null $pallet_id
 * @property Carbon|null $scanned_at
 */
class StockVerificationLine extends Model
{
    protected $fillable = [
        'stock_verification_id', 'pallet_id', 'scanned_barcode_value', 'expected',
        'scanned', 'outcome', 'system_location_id', 'scanned_at',
    ];

    protected function casts(): array
    {
        return ['expected' => 'boolean', 'scanned' => 'boolean', 'scanned_at' => 'datetime'];
    }

    public function pallet(): BelongsTo
    {
        return $this->belongsTo(Pallet::class);
    }

    public function systemLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'system_location_id');
    }
}
