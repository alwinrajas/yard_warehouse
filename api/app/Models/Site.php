<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property string|null $address
 * @property string|null $timezone
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Facility> $facilities
 */
class Site extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['code', 'name', 'address', 'timezone', 'is_active', 'created_by', 'updated_by'];

    /** Mirrors the database defaults so a freshly created model reports its real state. */
    protected $attributes = ['is_active' => true];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }
}
