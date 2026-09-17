<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $location_id
 * @property string $barcode_value
 * @property string $symbology
 * @property string $source
 * @property int $reprint_count
 * @property Carbon|null $first_printed_at
 * @property Carbon|null $last_printed_at
 * @property-read Location $location
 */
class LocationBarcode extends Model
{
    use HasFactory;

    /**
     * barcode_value is NOT fillable. LB-03: a reprint reproduces the same value,
     * and there is deliberately no mass-assignable path that rewrites it
     * (docs/11 §3.1).
     */
    protected $fillable = ['location_id', 'symbology', 'source'];

    protected $attributes = ['symbology' => 'CODE128', 'source' => 'SYSTEM_GENERATED', 'reprint_count' => 0];

    protected function casts(): array
    {
        return ['first_printed_at' => 'datetime', 'last_printed_at' => 'datetime', 'reprint_count' => 'integer'];
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
