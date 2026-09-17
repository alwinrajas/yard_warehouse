<?php

namespace App\Domain\Masters;

use App\Models\Site;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Site master business rules (docs/03 M1).
 *
 * Every rule lives here, not in a controller and not in React. Laravel is
 * authoritative (mandate §8).
 */
class SiteService
{
    public function create(array $data): Site
    {
        return DB::transaction(function () use ($data) {
            $this->assertCodeAvailable($data['code']);

            $site = Site::create($data + [
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            AuditLogger::record('site.created', $site, [], $site->getAttributes());

            return $site;
        });
    }

    public function update(Site $site, array $data): Site
    {
        return DB::transaction(function () use ($site, $data) {
            if (isset($data['code']) && $data['code'] !== $site->code) {
                $this->assertCodeAvailable($data['code'], $site->id);
            }

            $before = $site->getAttributes();
            $site->fill($data + ['updated_by' => Auth::id()]);
            $site->save();

            AuditLogger::recordChange('site.updated', $site, $before);

            return $site->refresh();
        });
    }

    public function setActive(Site $site, bool $active): Site
    {
        return DB::transaction(function () use ($site, $active) {
            if ($site->is_active === $active) {
                return $site;
            }

            $before = $site->getAttributes();
            $site->is_active = $active;
            $site->updated_by = Auth::id();
            $site->save();

            AuditLogger::recordChange($active ? 'site.activated' : 'site.deactivated', $site, $before);

            return $site->refresh();
        });
    }

    public function delete(Site $site): void
    {
        DB::transaction(function () use ($site) {
            $facilities = $site->facilities()->count();
            if ($facilities > 0) {
                throw BusinessRuleException::inUse('site', 'facilities', $facilities);
            }

            AuditLogger::record('site.deleted', $site, $site->getAttributes());
            $site->delete();
        });
    }

    private function assertCodeAvailable(string $code, ?int $ignoreId = null): void
    {
        $exists = Site::withTrashed()
            ->where('code', $code)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw BusinessRuleException::duplicateCode('site', $code, 'system');
        }
    }
}
