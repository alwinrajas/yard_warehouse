<?php

namespace App\Http\Resources;

use App\Models\SystemSetting;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SystemSetting */
class SystemSettingResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'reference' => $this->reference,
            'key' => $this->key,
            'group' => $this->group_name,
            'type' => $this->type,
            'value' => $this->value,
            'default_value' => $this->default_value,
            'allowed_values' => $this->allowed_values,
            'description' => $this->description,
            'notes' => $this->notes,
            'open_item' => $this->open_item,
            'is_editable' => $this->is_editable,
            'requires_confirmation' => $this->requires_confirmation,
            // Computed rather than stored: the lock depends on whether any
            // transaction exists, which changes without this row being written.
            'is_locked' => $this->resource->isLocked(),
            'locked_reason' => $this->resource->lockedReason(),
            'is_default' => $this->value === $this->default_value,
            'updated_by' => $this->whenLoaded('updatedBy', fn () => $this->updatedBy?->name),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
