<?php

namespace App\Http\Resources;

use App\Models\Location;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Location */
class LocationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'code' => $this->code,
            'description' => $this->description,
            'location_type' => $this->location_type,
            'capacity' => $this->capacity,
            'sequence' => $this->sequence,
            'site_id' => (string) $this->site_id,
            'facility_id' => (string) $this->facility_id,
            'facility_name' => $this->whenLoaded('facility', fn () => $this->facility->name),
            'facility_type' => $this->whenLoaded('facility', fn () => $this->facility->type),
            'zone_id' => $this->zone_id !== null ? (string) $this->zone_id : null,
            'zone_name' => $this->whenLoaded('zone', fn () => $this->zone?->name),
            'is_active' => $this->is_active,
            'is_blocked' => $this->is_blocked,
            'blocked_reason' => $this->whenLoaded('blockedReason', fn () => $this->blockedReason?->name),
            'blocked_remarks' => $this->blocked_remarks,
            'blocked_at' => $this->blocked_at?->toIso8601String(),
            'occupied_count' => $this->whenCounted('locationInventory'),
            // Derived occupancy state for the board and LocationRef (docs/21 §2.5).
            // Inactive and blocked outrank occupancy: an operator needs to know the
            // location is unusable before knowing how full it is.
            'state' => $this->derivedState(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /** @see docs/21 §2.5 — the five states LocationRef and the occupancy board render. */
    private function derivedState(): string
    {
        if (! $this->is_active) {
            return 'inactive';
        }

        if ($this->is_blocked) {
            return 'blocked';
        }

        $occupied = $this->resource->getAttribute('location_inventory_count');

        if ($occupied === null || (int) $occupied === 0) {
            return 'empty';
        }

        if ($this->capacity !== null && (int) $occupied >= $this->capacity) {
            return 'full';
        }

        return 'occupied';
    }
}
