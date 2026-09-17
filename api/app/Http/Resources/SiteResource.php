<?php

namespace App\Http\Resources;

use App\Models\Site;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Site */
class SiteResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'address' => $this->address,
            'timezone' => $this->timezone,
            'is_active' => $this->is_active,
            'facility_count' => $this->whenCounted('facilities'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
