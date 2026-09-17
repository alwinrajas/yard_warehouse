<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property string $category
 * @property bool $requires_remarks
 * @property bool $is_active
 */
class ReasonCode extends Model
{
    use HasFactory, SoftDeletes;

    public const CATEGORIES = [
        'TRANSFER', 'DISPATCH_CANCEL', 'CORRECTION',
        'HOLD', 'DAMAGE', 'LOCATION_BLOCK', 'OTHER',
    ];

    protected $fillable = ['code', 'name', 'category', 'requires_remarks', 'is_active', 'created_by', 'updated_by'];

    protected $attributes = ['is_active' => true, 'requires_remarks' => false];

    protected function casts(): array
    {
        return ['requires_remarks' => 'boolean', 'is_active' => 'boolean'];
    }
}
