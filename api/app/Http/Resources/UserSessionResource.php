<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Support\BusinessTime;
use Illuminate\Http\Resources\Json\JsonResource;

/** The session payload consumed by the web BFF and the PDA (docs/02 §5). */
/** @mixin User */
class UserSessionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'user_id' => (string) $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'role' => $this->role?->code,
            'role_label' => $this->role?->name,
            'site_id' => $this->site_id !== null ? (string) $this->site_id : null,
            'site_name' => $this->site?->name,
            'facilities' => $this->facilities->map(fn ($facility) => [
                'id' => (string) $facility->id,
                'code' => $facility->code,
                'name' => $facility->name,
            ])->values(),
            'permissions' => $this->permissionCodes(),
            'must_change_password' => $this->must_change_password,
            // CFG-13, carried on the session so every client renders dates in
            // the yard's timezone without needing settings.view or a second
            // configuration source (OI-19).
            'app_timezone' => BusinessTime::zone(),
        ];
    }
}
