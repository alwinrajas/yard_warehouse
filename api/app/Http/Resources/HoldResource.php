<?php

namespace App\Http\Resources;

use App\Models\PalletHold;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PalletHold */
class HoldResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'pallet_id' => (string) $this->pallet_id,
            'pallet_number' => $this->whenLoaded('pallet', fn () => $this->pallet->pallet_number),
            'job_number' => $this->whenLoaded('pallet', fn () => $this->pallet->job_number),
            'hold_type' => $this->hold_type,
            'reason' => $this->whenLoaded('reasonCode', fn () => $this->reasonCode?->name),
            'remarks' => $this->remarks,
            'placed_by' => $this->whenLoaded('placedBy', fn () => $this->placedBy?->name),
            'placed_at' => $this->placed_at?->toIso8601String(),
            'released_at' => $this->released_at?->toIso8601String(),
            'release_remarks' => $this->release_remarks,
            'is_open' => $this->is_open,
            'days_held' => $this->placed_at?->startOfDay()->diffInDays(($this->released_at ?? now())->startOfDay()),
        ];
    }
}
