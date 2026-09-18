<?php

namespace App\Http\Resources;

use App\Models\InventoryCurrent;
use App\Support\BusinessTime;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin InventoryCurrent */
class InventoryResource extends JsonResource
{
    public function toArray($request): array
    {
        $pallet = $this->pallet;
        $ageing = BusinessTime::daysStanding($this->putaway_at);

        return [
            'pallet_id' => (string) $this->pallet_id,
            'pallet_number' => $pallet?->pallet_number,
            'job_number' => $pallet?->job_number,
            'customer_name' => $pallet?->customer?->name ?? $pallet?->customer_name_raw,
            'lpo_number' => $pallet?->lpo_number,
            'display_status' => $pallet?->displayStatus(),
            'block_state' => $pallet?->block_state,
            'location_id' => (string) $this->location_id,
            'location_code' => $this->location?->code,
            'facility_id' => (string) $this->facility_id,
            'facility_name' => $this->facility?->name,
            'zone_id' => $this->zone_id !== null ? (string) $this->zone_id : null,
            'zone_name' => $this->zone?->name,
            'putaway_at' => $this->putaway_at?->toIso8601String(),
            'stored_at' => $this->stored_at?->toIso8601String(),
            'last_movement_at' => $pallet?->last_movement_at?->toIso8601String(),
            'last_action_by' => $this->lastActionBy?->name,
            'ageing_days' => $ageing,
        ];
    }
}
