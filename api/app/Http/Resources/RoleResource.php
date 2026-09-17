<?php

namespace App\Http\Resources;

use App\Models\Role;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Role */
class RoleResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'is_system' => $this->is_system,
            'is_active' => $this->is_active,
            'permission_count' => $this->whenCounted('permissions'),
            'user_count' => $this->whenCounted('users'),
            'permissions' => $this->whenLoaded(
                'permissions',
                fn () => $this->permissions->pluck('code')->values(),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
