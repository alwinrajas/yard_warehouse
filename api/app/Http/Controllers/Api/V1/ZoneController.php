<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Masters\ZoneService;
use App\Http\Controllers\Controller;
use App\Http\Requests\ZoneRequest;
use App\Http\Resources\ZoneResource;
use App\Models\Facility;
use App\Models\Zone;
use App\Support\ApiResponse;
use App\Support\BusinessRuleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZoneController extends Controller
{
    public function __construct(private readonly ZoneService $service) {}

    public function index(Request $request): JsonResponse
    {
        $visibleFacilityIds = Facility::query()->visibleTo($request->user())->pluck('id');

        $query = Zone::query()
            ->with('facility')
            ->withCount('locations')
            ->whereIn('facility_id', $visibleFacilityIds);

        if ($facilityId = $request->query('facility_id')) {
            $query->where('facility_id', $facilityId);
        }

        if ($siteId = $request->query('site_id')) {
            $query->whereHas('facility', fn ($q) => $q->where('site_id', $siteId));
        }

        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('code', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
        }

        if (($status = $request->query('status')) !== null && $status !== 'all') {
            $query->where('is_active', $status === 'active');
        }

        $sort = in_array($request->query('sort'), ['code', 'name', 'sequence', 'created_at'], true) ? $request->query('sort') : 'sequence';
        $query->orderBy($sort, $request->query('dir') === 'desc' ? 'desc' : 'asc')->orderBy('code');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            ZoneResource::class,
        );
    }

    public function show(Request $request, Zone $zone): JsonResponse
    {
        $this->assertVisible($request, $zone);

        return ApiResponse::resource(new ZoneResource($zone->load('facility')->loadCount('locations')));
    }

    public function store(ZoneRequest $request): JsonResponse
    {
        $zone = $this->service->create($request->validated());

        return ApiResponse::resource(new ZoneResource($zone->load('facility')), 201);
    }

    public function update(ZoneRequest $request, Zone $zone): JsonResponse
    {
        $this->assertVisible($request, $zone);

        return ApiResponse::resource(new ZoneResource($this->service->update($zone, $request->validated())->load('facility')));
    }

    public function setActive(Request $request, Zone $zone): JsonResponse
    {
        $this->assertVisible($request, $zone);
        $data = $request->validate(['is_active' => ['required', 'boolean']]);

        return ApiResponse::resource(new ZoneResource($this->service->setActive($zone, $data['is_active'])->load('facility')));
    }

    public function destroy(Request $request, Zone $zone): JsonResponse
    {
        $this->assertVisible($request, $zone);
        $this->service->delete($zone);

        return ApiResponse::success(['deleted' => true]);
    }

    private function assertVisible(Request $request, Zone $zone): void
    {
        if (! $request->user()->canAccessFacility($zone->facility_id)) {
            throw BusinessRuleException::outOfScope();
        }
    }
}
