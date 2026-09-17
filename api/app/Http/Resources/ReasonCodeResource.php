<?php

namespace App\Http\Resources;

use App\Models\ReasonCode;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ReasonCode */
class ReasonCodeResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'category' => $this->category,
            'requires_remarks' => $this->requires_remarks,
            'is_active' => $this->is_active,
        ];
    }
}
