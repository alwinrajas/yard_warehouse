<?php

namespace App\Domain\Masters;

use App\Models\Facility;
use App\Models\Zone;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ZoneService
{
    public function create(array $data): Zone
    {
        return DB::transaction(function () use ($data) {
            $facility = Facility::findOrFail($data['facility_id']);
            if (! $facility->is_active) {
                throw BusinessRuleException::inactiveParent('facility');
            }

            $this->assertCodeAvailable((int) $data['facility_id'], $data['code']);

            $zone = Zone::create($data + [
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            AuditLogger::record('zone.created', $zone, [], $zone->getAttributes());

            return $zone;
        });
    }

    public function update(Zone $zone, array $data): Zone
    {
        return DB::transaction(function () use ($zone, $data) {
            $targetFacilityId = (int) ($data['facility_id'] ?? $zone->facility_id);

            if ($targetFacilityId !== $zone->facility_id) {
                $locations = $zone->locations()->count();
                if ($locations > 0) {
                    throw new BusinessRuleException(
                        'ZONE_FACILITY_LOCKED',
                        "This zone holds {$locations} locations, so it cannot be moved to another facility.",
                        409,
                        ['location_count' => $locations],
                    );
                }
                Facility::findOrFail($targetFacilityId);
            }

            if (isset($data['code']) && $data['code'] !== $zone->code) {
                $this->assertCodeAvailable($targetFacilityId, $data['code'], $zone->id);
            }

            $before = $zone->getAttributes();
            $zone->fill($data + ['updated_by' => Auth::id()]);
            $zone->save();

            AuditLogger::recordChange('zone.updated', $zone, $before);

            return $zone->refresh();
        });
    }

    public function setActive(Zone $zone, bool $active): Zone
    {
        return DB::transaction(function () use ($zone, $active) {
            if ($zone->is_active === $active) {
                return $zone;
            }

            $before = $zone->getAttributes();
            $zone->is_active = $active;
            $zone->updated_by = Auth::id();
            $zone->save();

            AuditLogger::recordChange($active ? 'zone.activated' : 'zone.deactivated', $zone, $before);

            return $zone->refresh();
        });
    }

    public function delete(Zone $zone): void
    {
        DB::transaction(function () use ($zone) {
            $locations = $zone->locations()->count();
            if ($locations > 0) {
                throw BusinessRuleException::inUse('zone', 'locations', $locations);
            }

            AuditLogger::record('zone.deleted', $zone, $zone->getAttributes());
            $zone->delete();
        });
    }

    private function assertCodeAvailable(int $facilityId, string $code, ?int $ignoreId = null): void
    {
        $exists = Zone::withTrashed()
            ->where('facility_id', $facilityId)
            ->where('code', $code)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw BusinessRuleException::duplicateCode('zone', $code, 'facility');
        }
    }
}
