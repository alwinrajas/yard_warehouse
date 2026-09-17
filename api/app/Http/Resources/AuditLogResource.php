<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AuditLog */
class AuditLogResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'event' => $this->event,
            'entity_type' => $this->auditable_type !== null ? class_basename($this->auditable_type) : null,
            'entity_id' => $this->auditable_id !== null ? (string) $this->auditable_id : null,
            'user_id' => $this->user_id !== null ? (string) $this->user_id : null,
            'user_name' => $this->whenLoaded('user', fn () => $this->user?->name),
            'ip_address' => $this->ip_address,
            'device_id' => $this->device_id,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'context' => $this->context,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
