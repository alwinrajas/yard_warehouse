<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $reference
 * @property Carbon|null $started_at
 * @property Carbon|null $submitted_at
 * @property Carbon|null $reviewed_at
 * @property string $status
 * @property int $location_id
 * @property int $expected_count
 * @property int $scanned_count
 * @property int $matched_count
 * @property int $missing_count
 * @property int $unexpected_count
 * @property-read Location $location
 * @property-read Collection<int, StockVerificationLine> $lines
 * @property string|null $review_remarks
 * @property string $reference
 * @property Carbon|null $started_at
 * @property Carbon|null $submitted_at
 * @property Carbon|null $reviewed_at
 */
class StockVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference', 'location_id', 'facility_id', 'site_id', 'status',
        'expected_count', 'scanned_count', 'matched_count', 'missing_count', 'unexpected_count',
        'started_by', 'started_at', 'submitted_at', 'reviewed_by', 'reviewed_at', 'review_remarks', 'device_id',
    ];

    protected $attributes = ['status' => 'DRAFT'];

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'submitted_at' => 'datetime', 'reviewed_at' => 'datetime'];
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(StockVerificationLine::class);
    }
}
