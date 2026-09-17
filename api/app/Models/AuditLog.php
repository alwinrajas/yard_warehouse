<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only. `$timestamps = false` with an explicit created_at is deliberate:
 * there is no updated_at column, because a row that can be modified is not an
 * audit record (docs/04 §2.1).
 */
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'event', 'auditable_type', 'auditable_id', 'user_id', 'ip_address',
        'user_agent', 'device_id', 'old_values', 'new_values', 'context',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'context' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
