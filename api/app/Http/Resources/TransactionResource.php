<?php

namespace App\Http\Resources;

use App\Models\InventoryTransaction;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin InventoryTransaction */
class TransactionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'txn_ref' => $this->txn_ref,
            'type' => $this->type,
            'pallet_id' => (string) $this->pallet_id,
            'pallet_number' => $this->whenLoaded('pallet', fn () => $this->pallet->pallet_number),
            'job_number' => $this->whenLoaded('pallet', fn () => $this->pallet->job_number),
            'source_location_id' => $this->source_location_id !== null ? (string) $this->source_location_id : null,
            'source_location_code' => $this->whenLoaded('sourceLocation', fn () => $this->sourceLocation?->code),
            'destination_location_id' => $this->destination_location_id !== null ? (string) $this->destination_location_id : null,
            'destination_location_code' => $this->whenLoaded('destinationLocation', fn () => $this->destinationLocation?->code),
            'previous_lifecycle_status' => $this->previous_lifecycle_status,
            'new_lifecycle_status' => $this->new_lifecycle_status,
            'previous_block_state' => $this->previous_block_state,
            'new_block_state' => $this->new_block_state,
            'previous_values' => $this->previous_values,
            'new_values' => $this->new_values,
            'reason' => $this->whenLoaded('reasonCode', fn () => $this->reasonCode?->name),
            'remarks' => $this->remarks,
            'user_id' => (string) $this->user_id,
            'user_name' => $this->whenLoaded('user', fn () => $this->user?->name),
            'device_id' => $this->device_id,
            'channel' => $this->channel,
            'correction_of_transaction_id' => $this->correction_of_transaction_id !== null ? (string) $this->correction_of_transaction_id : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
