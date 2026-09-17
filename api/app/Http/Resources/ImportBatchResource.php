<?php

namespace App\Http\Resources;

use App\Models\ImportBatch;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ImportBatch */
class ImportBatchResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => $this->type,
            'original_filename' => $this->original_filename,
            'status' => $this->status,
            'total_rows' => $this->total_rows,
            'valid_rows' => $this->valid_rows,
            'error_rows' => $this->error_rows,
            'errors' => $this->errors,
            // A preview of what will be written, so the user commits knowingly.
            'preview' => $this->when(
                $this->status === 'VALIDATED',
                fn () => array_slice($this->validated_payload ?? [], 0, 20),
            ),
            'committed_at' => $this->committed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
