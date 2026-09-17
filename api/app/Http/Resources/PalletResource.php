<?php

namespace App\Http\Resources;

use App\Models\Pallet;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pallet */
class PalletResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'pallet_key' => $this->pallet_key,
            'pallet_number' => $this->pallet_number,
            'job_number' => $this->job_number,
            'raw_barcode_value' => $this->raw_barcode_value,
            'barcode_profile' => $this->barcode_profile,
            'customer_id' => $this->customer_id !== null ? (string) $this->customer_id : null,
            'customer_name' => $this->relationLoaded('customer') && $this->customer !== null ? $this->customer->name : $this->customer_name_raw,
            'lpo_number' => $this->lpo_number,
            'lifecycle_status' => $this->lifecycle_status,
            'block_state' => $this->block_state,
            // The single status users see (docs/05 §1).
            'display_status' => $this->displayStatus(),
            'first_putaway_at' => $this->first_putaway_at?->toIso8601String(),
            'last_movement_at' => $this->last_movement_at?->toIso8601String(),
            'dispatched_at' => $this->dispatched_at?->toIso8601String(),
            'ageing_days' => $this->first_putaway_at !== null && $this->dispatched_at === null
                ? $this->first_putaway_at->startOfDay()->diffInDays(now()->startOfDay())
                : null,
            // relationLoaded() distinguishes "not loaded" from "loaded and null".
            // A dispatched pallet has no current row at all (FR-012).
            'location' => $this->when(
                $this->relationLoaded('current') && $this->current !== null,
                fn () => [
                    'id' => (string) $this->current->location_id,
                    'code' => $this->current->location->code ?? null,
                    'facility_name' => $this->current->facility->name ?? null,
                    'zone_name' => $this->current->zone->name ?? null,
                    'stored_at' => $this->current->stored_at?->toIso8601String(),
                    'putaway_at' => $this->current->putaway_at?->toIso8601String(),
                ],
            ),
        ];
    }
}
