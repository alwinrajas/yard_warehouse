<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $facility_id
 * @property string $code
 * @property string $name
 * @property string|null $description
 * @property int $sequence
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Facility $facility
 * @property-read Collection<int, Location> $locations
 */
class Zone extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['facility_id', 'code', 'name', 'description', 'sequence', 'is_active', 'created_by', 'updated_by'];

    protected $attributes = ['is_active' => true, 'sequence' => 0];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'sequence' => 'integer'];
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }
}
