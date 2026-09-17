<?php

namespace App\Http\Resources;

use App\Models\Zone;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Zone */
class ZoneResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'facility_id' => (string) $this->facility_id,
            'facility_name' => $this->whenLoaded('facility', fn () => $this->facility->name),
            'facility_code' => $this->whenLoaded('facility', fn () => $this->facility->code),
            'site_id' => $this->whenLoaded('facility', fn () => (string) $this->facility->site_id),
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'sequence' => $this->sequence,
            'is_active' => $this->is_active,
            'location_count' => $this->whenCounted('locations'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
