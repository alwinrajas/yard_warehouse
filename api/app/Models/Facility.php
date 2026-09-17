<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $site_id
 * @property string $code
 * @property string $name
 * @property string $type
 * @property string|null $description
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Site $site
 * @property-read Collection<int, Zone> $zones
 * @property-read Collection<int, Location> $locations
 */
class Facility extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPES = ['OPEN_YARD', 'CLOSED_WAREHOUSE', 'DISPATCH_AREA', 'COLLECTION_AREA'];

    /** Facility types that accept normal storage put-away (docs/03 M1). */
    public const STORAGE_TYPES = ['OPEN_YARD', 'CLOSED_WAREHOUSE'];

    protected $fillable = ['site_id', 'code', 'name', 'type', 'description', 'is_active', 'created_by', 'updated_by'];

    protected $attributes = ['is_active' => true];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function zones(): HasMany
    {
        return $this->hasMany(Zone::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    /** Restricts to the facilities a user may see (BR-09, docs/07 §4). */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->site_id !== null) {
            $query->where('site_id', $user->site_id);
        }

        $allowed = $user->facilityAccessIds();
        if ($allowed !== []) {
            $query->whereIn('id', $allowed);
        }

        return $query;
    }
}
