<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'employee_code' => $this->employee_code,
            'email' => $this->email,
            'role_id' => $this->role_id !== null ? (string) $this->role_id : null,
            'role_code' => $this->whenLoaded('role', fn () => $this->role?->code),
            'role_name' => $this->whenLoaded('role', fn () => $this->role?->name),
            'site_id' => $this->site_id !== null ? (string) $this->site_id : null,
            'site_name' => $this->whenLoaded('site', fn () => $this->site?->name),
            'facilities' => $this->whenLoaded('facilities', fn () => $this->facilities->map(fn ($f) => [
                'id' => (string) $f->id, 'code' => $f->code, 'name' => $f->name,
            ])->values()),
            'is_active' => $this->is_active,
            'must_change_password' => $this->must_change_password,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'is_locked' => $this->isLocked(),
        ];
    }
}
