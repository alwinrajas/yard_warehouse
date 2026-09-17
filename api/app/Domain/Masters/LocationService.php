<?php

namespace App\Domain\Masters;

use App\Models\Facility;
use App\Models\Location;
use App\Models\ReasonCode;
use App\Models\Zone;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Location master business rules (docs/03 M1, docs/04 §2.2).
 *
 * The hierarchy rule enforced here — a zone must belong to the selected facility,
 * and the facility to the selected site — is the one that keeps the yard's
 * digital map consistent with the physical one. A foreign key alone cannot
 * express it, because zone and facility are siblings on this row.
 */
class LocationService
{
    /**
     * Resolves and validates the site/facility/zone triple.
     *
     * @return array{site_id:int, facility_id:int, zone_id:int|null}
     */
    public function resolveHierarchy(int $facilityId, ?int $zoneId, bool $requireActive = true): array
    {
        $facility = Facility::find($facilityId);
        if ($facility === null) {
            throw new BusinessRuleException('FACILITY_NOT_FOUND', 'The selected facility does not exist.', 422);
        }

        if ($requireActive && ! $facility->is_active) {
            throw BusinessRuleException::inactiveParent('facility');
        }

        if ($zoneId !== null) {
            $zone = Zone::find($zoneId);
            if ($zone === null) {
                throw new BusinessRuleException('ZONE_NOT_FOUND', 'The selected zone does not exist.', 422);
            }
            if ($zone->facility_id !== $facility->id) {
                throw BusinessRuleException::invalidZoneForFacility();
            }
            if ($requireActive && ! $zone->is_active) {
                throw BusinessRuleException::inactiveParent('zone');
            }
        }

        return [
            'site_id' => $facility->site_id,
            'facility_id' => $facility->id,
            'zone_id' => $zoneId,
        ];
    }

    public function create(array $data): Location
    {
        return DB::transaction(function () use ($data) {
            $hierarchy = $this->resolveHierarchy(
                (int) $data['facility_id'],
                isset($data['zone_id']) ? (int) $data['zone_id'] : null,
            );

            $this->assertCodeAvailable($hierarchy['site_id'], $data['code']);

            $location = Location::create(array_merge($data, $hierarchy, [
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]));

            AuditLogger::record('location.created', $location, [], $location->getAttributes());

            return $location;
        });
    }

    public function update(Location $location, array $data): Location
    {
        return DB::transaction(function () use ($location, $data) {
            $facilityId = (int) ($data['facility_id'] ?? $location->facility_id);
            $zoneId = array_key_exists('zone_id', $data)
                ? ($data['zone_id'] !== null ? (int) $data['zone_id'] : null)
                : $location->zone_id;

            $hierarchy = $this->resolveHierarchy($facilityId, $zoneId);

            if ($hierarchy['site_id'] !== $location->site_id) {
                // A location code is unique per site. Moving a location across
                // sites would change its identity, which must never happen
                // silently (mandate §8).
                throw new BusinessRuleException(
                    'LOCATION_SITE_IMMUTABLE',
                    'A location cannot be moved to a different site. Its code identity is unique per site.',
                    422,
                );
            }

            if (isset($data['code']) && $data['code'] !== $location->code) {
                $this->assertCodeAvailable($location->site_id, $data['code'], $location->id);
            }

            $before = $location->getAttributes();
            $location->fill(array_merge($data, $hierarchy, ['updated_by' => Auth::id()]));
            $location->save();

            AuditLogger::recordChange('location.updated', $location, $before);

            return $location->refresh();
        });
    }

    public function setActive(Location $location, bool $active): Location
    {
        return DB::transaction(function () use ($location, $active) {
            if ($location->is_active === $active) {
                return $location;
            }

            $before = $location->getAttributes();
            $location->is_active = $active;
            $location->updated_by = Auth::id();
            $location->save();

            AuditLogger::recordChange($active ? 'location.activated' : 'location.deactivated', $location, $before);

            return $location->refresh();
        });
    }

    /**
     * Blocking is an operational state distinct from deactivation, and it
     * requires a reason so the occupancy board can say why (docs/05 §3.4).
     */
    public function block(Location $location, int $reasonCodeId, ?string $remarks): Location
    {
        return DB::transaction(function () use ($location, $reasonCodeId, $remarks) {
            $reason = ReasonCode::find($reasonCodeId);
            if ($reason === null || $reason->category !== 'LOCATION_BLOCK' || ! $reason->is_active) {
                throw new BusinessRuleException(
                    'INVALID_REASON_CODE',
                    'Select an active reason code for blocking a location.',
                    422,
                );
            }

            if ($reason->requires_remarks && blank($remarks)) {
                throw new BusinessRuleException(
                    'REMARKS_REQUIRED',
                    'This reason requires remarks.',
                    422,
                );
            }

            $before = $location->getAttributes();
            $location->forceFill([
                'is_blocked' => true,
                'blocked_reason_id' => $reason->id,
                'blocked_remarks' => $remarks,
                'blocked_by' => Auth::id(),
                'blocked_at' => now(),
                'updated_by' => Auth::id(),
            ])->save();

            AuditLogger::recordChange('location.blocked', $location, $before);

            return $location->refresh();
        });
    }

    public function unblock(Location $location): Location
    {
        return DB::transaction(function () use ($location) {
            if (! $location->is_blocked) {
                return $location;
            }

            $before = $location->getAttributes();
            $location->forceFill([
                'is_blocked' => false,
                'blocked_reason_id' => null,
                'blocked_remarks' => null,
                'blocked_by' => null,
                'blocked_at' => null,
                'updated_by' => Auth::id(),
            ])->save();

            AuditLogger::recordChange('location.unblocked', $location, $before);

            return $location->refresh();
        });
    }

    public function delete(Location $location): void
    {
        DB::transaction(function () use ($location) {
            // Once inventory exists, occupancy must be checked here too. The
            // inventory tables arrive in a later increment (docs/27 U-4).
            AuditLogger::record('location.deleted', $location, $location->getAttributes());
            $location->delete();
        });
    }

    public function assertCodeAvailable(int $siteId, string $code, ?int $ignoreId = null): void
    {
        $exists = Location::withTrashed()
            ->where('site_id', $siteId)
            ->where('code', $code)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw BusinessRuleException::duplicateCode('location', $code, 'site');
        }
    }
}
