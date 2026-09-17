<?php

namespace App\Http\Resources;

use App\Models\LocationBarcode;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin LocationBarcode */
class LocationBarcodeResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'location_id' => (string) $this->location_id,
            'location_code' => $this->whenLoaded('location', fn () => $this->location->code),
            'facility_name' => $this->whenLoaded('location', fn () => $this->location->facility->name),
            'zone_name' => $this->whenLoaded('location', fn () => $this->location->zone?->name),
            'barcode_value' => $this->barcode_value,
            'symbology' => $this->symbology,
            'source' => $this->source,
            'first_printed_at' => $this->first_printed_at?->toIso8601String(),
            'last_printed_at' => $this->last_printed_at?->toIso8601String(),
            'reprint_count' => $this->reprint_count,
        ];
    }
}
