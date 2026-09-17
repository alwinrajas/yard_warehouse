<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property array<int, array<string, mixed>>|null $validated_payload
 * @property array<int, array<string, mixed>>|null $errors
 * @property int|null $site_id
 * @property string $type
 * @property string $status
 * @property Carbon|null $committed_at
 * @property Carbon|null $created_at
 */
class ImportBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'type', 'original_filename', 'status', 'total_rows', 'valid_rows', 'error_rows',
        'validated_payload', 'errors', 'site_id', 'uploaded_by', 'committed_by', 'committed_at',
    ];

    protected function casts(): array
    {
        return [
            'validated_payload' => 'array',
            'errors' => 'array',
            'committed_at' => 'datetime',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
