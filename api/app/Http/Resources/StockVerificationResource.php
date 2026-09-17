<?php

namespace App\Http\Resources;

use App\Models\StockVerification;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin StockVerification */
class StockVerificationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'reference' => $this->reference,
            'status' => $this->status,
            'location_id' => (string) $this->location_id,
            'location_code' => $this->whenLoaded('location', fn () => $this->location->code),
            'expected_count' => $this->expected_count,
            'scanned_count' => $this->scanned_count,
            'matched_count' => $this->matched_count,
            'missing_count' => $this->missing_count,
            'unexpected_count' => $this->unexpected_count,
            'variance' => $this->missing_count + $this->unexpected_count,
            'started_at' => $this->started_at?->toIso8601String(),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'review_remarks' => $this->review_remarks,
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(fn ($line) => [
                'id' => (string) $line->id,
                'pallet_id' => $line->pallet_id !== null ? (string) $line->pallet_id : null,
                'pallet_number' => $line->pallet?->pallet_number,
                'outcome' => $line->outcome,
                'expected' => $line->expected,
                'scanned' => $line->scanned,
                'system_location_code' => $line->systemLocation?->code,
                'scanned_at' => $line->scanned_at?->toIso8601String(),
            ])->values()),
        ];
    }
}
