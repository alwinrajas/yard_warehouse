<?php

namespace App\Http\Resources;

use App\Models\Facility;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Facility */
class FacilityResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'site_id' => (string) $this->site_id,
            'site_name' => $this->whenLoaded('site', fn () => $this->site->name),
            'site_code' => $this->whenLoaded('site', fn () => $this->site->code),
            'code' => $this->code,
            'name' => $this->name,
            'type' => $this->type,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'zone_count' => $this->whenCounted('zones'),
            'location_count' => $this->whenCounted('locations'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
