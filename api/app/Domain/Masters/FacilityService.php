<?php

namespace App\Domain\Masters;

use App\Models\Facility;
use App\Models\Site;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FacilityService
{
    public function create(array $data): Facility
    {
        return DB::transaction(function () use ($data) {
            $site = Site::findOrFail($data['site_id']);
            $this->assertSiteInScope($site);
            $this->assertSiteUsable($site);
            $this->assertCodeAvailable((int) $data['site_id'], $data['code']);

            $facility = Facility::create($data + [
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            AuditLogger::record('facility.created', $facility, [], $facility->getAttributes());

            return $facility;
        });
    }

    public function update(Facility $facility, array $data): Facility
    {
        return DB::transaction(function () use ($facility, $data) {
            $targetSiteId = (int) ($data['site_id'] ?? $facility->site_id);

            if ($targetSiteId !== $facility->site_id) {
                // Moving a facility between sites would orphan every location code
                // that is unique per site, and silently change location identity.
                throw new BusinessRuleException(
                    'FACILITY_SITE_IMMUTABLE',
                    'A facility cannot be moved to a different site. Create a facility in the target site instead.',
                    422,
                );
            }

            if (isset($data['code']) && $data['code'] !== $facility->code) {
                $this->assertCodeAvailable($targetSiteId, $data['code'], $facility->id);
            }

            if (isset($data['type']) && $data['type'] !== $facility->type) {
                $locations = $facility->locations()->count();
                if ($locations > 0) {
                    throw new BusinessRuleException(
                        'FACILITY_TYPE_LOCKED',
                        "This facility already holds {$locations} locations, so its type cannot be changed.",
                        409,
                        ['location_count' => $locations],
                    );
                }
            }

            $before = $facility->getAttributes();
            $facility->fill($data + ['updated_by' => Auth::id()]);
            $facility->save();

            AuditLogger::recordChange('facility.updated', $facility, $before);

            return $facility->refresh();
        });
    }

    public function setActive(Facility $facility, bool $active): Facility
    {
        return DB::transaction(function () use ($facility, $active) {
            if ($facility->is_active === $active) {
                return $facility;
            }

            $before = $facility->getAttributes();
            $facility->is_active = $active;
            $facility->updated_by = Auth::id();
            $facility->save();

            AuditLogger::recordChange($active ? 'facility.activated' : 'facility.deactivated', $facility, $before);

            return $facility->refresh();
        });
    }

    public function delete(Facility $facility): void
    {
        DB::transaction(function () use ($facility) {
            $zones = $facility->zones()->count();
            if ($zones > 0) {
                throw BusinessRuleException::inUse('facility', 'zones', $zones);
            }

            $locations = $facility->locations()->count();
            if ($locations > 0) {
                throw BusinessRuleException::inUse('facility', 'locations', $locations);
            }

            AuditLogger::record('facility.deleted', $facility, $facility->getAttributes());
            $facility->delete();
        });
    }

    /**
     * A user pinned to a site cannot create facilities elsewhere — otherwise they
     * could create a record they are then unable to see (docs/07 §4 SC-01).
     */
    private function assertSiteInScope(Site $site): void
    {
        $user = Auth::user();
        if ($user !== null && $user->site_id !== null && $user->site_id !== $site->id) {
            throw BusinessRuleException::outOfScope();
        }
    }

    private function assertSiteUsable(Site $site): void
    {
        if (! $site->is_active) {
            throw BusinessRuleException::inactiveParent('site');
        }
    }

    private function assertCodeAvailable(int $siteId, string $code, ?int $ignoreId = null): void
    {
        $exists = Facility::withTrashed()
            ->where('site_id', $siteId)
            ->where('code', $code)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw BusinessRuleException::duplicateCode('facility', $code, 'site');
        }
    }
}
