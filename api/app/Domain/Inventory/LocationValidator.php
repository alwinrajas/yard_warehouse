<?php

namespace App\Domain\Inventory;

use App\Models\Location;
use App\Models\LocationBarcode;
use App\Models\User;
use App\Support\BusinessRuleException;

/**
 * Location checks for inventory operations, in the order the operator most needs
 * to hear them (docs/05 §3.1).
 */
class LocationValidator
{
    public function resolveByBarcode(string $barcode): Location
    {
        $value = trim($barcode);

        $record = LocationBarcode::where('barcode_value', $value)->first();
        $location = $record?->location ?? Location::where('code', $value)->first();

        if ($location === null) {
            throw new BusinessRuleException(
                'LOCATION_NOT_FOUND',
                'That location barcode is not recognised.',
                404,
                ['barcode' => $value],
            );
        }

        return $location;
    }

    public function assertAcceptsInbound(Location $location, User $user, bool $forStorage = true): void
    {
        if (! $location->is_active) {
            throw new BusinessRuleException(
                'LOCATION_INACTIVE',
                "Location {$location->code} is not in use.",
                422,
                ['location_code' => $location->code],
            );
        }

        if ($location->is_blocked) {
            $location->loadMissing('blockedReason');
            throw new BusinessRuleException(
                'LOCATION_BLOCKED',
                "Location {$location->code} is blocked.",
                423,
                [
                    'location_code' => $location->code,
                    'reason' => $location->blockedReason?->name,
                    'remarks' => $location->blocked_remarks,
                ],
            );
        }

        if ($forStorage && ! in_array($location->location_type, ['STORAGE', 'STAGING'], true)) {
            throw new BusinessRuleException(
                'LOCATION_TYPE_INVALID',
                "Location {$location->code} is a {$location->location_type} location and cannot hold stored pallets.",
                422,
            );
        }

        if (! $user->canAccessFacility($location->facility_id)) {
            throw BusinessRuleException::outOfScope();
        }
    }

    /** CFG-06 capacity enforcement. OFF by default — OI-04 is unconfirmed. */
    public function assertCapacity(Location $location, int $currentOccupancy): void
    {
        $mode = config('alutrack.capacity_enforcement', 'OFF');

        if ($mode !== 'BLOCK' || $location->capacity === null) {
            return;
        }

        if ($currentOccupancy >= $location->capacity) {
            throw new BusinessRuleException(
                'LOCATION_CAPACITY_EXCEEDED',
                "Location {$location->code} already holds {$currentOccupancy} of {$location->capacity} pallets.",
                422,
                ['capacity' => $location->capacity, 'occupancy' => $currentOccupancy],
            );
        }
    }
}
