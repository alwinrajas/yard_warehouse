<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Masters\LocationService;
use App\Http\Controllers\Controller;
use App\Http\Requests\LocationRequest;
use App\Http\Resources\LocationResource;
use App\Models\Facility;
use App\Models\Location;
use App\Support\ApiResponse;
use App\Support\BusinessRuleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function __construct(private readonly LocationService $service) {}

    public function index(Request $request): JsonResponse
    {
        $visibleFacilityIds = Facility::query()->visibleTo($request->user())->pluck('id');

        // Eager loading throughout — the list renders facility and zone names,
        // and an N+1 here would be 50 extra queries per page.
        $query = Location::query()
            ->with(['facility', 'zone', 'blockedReason'])
            ->withCount('locationInventory')
            ->whereIn('facility_id', $visibleFacilityIds);

        foreach (['facility_id', 'zone_id', 'site_id', 'location_type'] as $filter) {
            if ($value = $request->query($filter)) {
                $query->where($filter, $value);
            }
        }

        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('code', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%"));
        }

        if (($status = $request->query('status')) !== null && $status !== 'all') {
            $query->where('is_active', $status === 'active');
        }

        if (($blocked = $request->query('blocked')) !== null && $blocked !== 'all') {
            $query->where('is_blocked', $blocked === 'blocked');
        }

        $sort = in_array($request->query('sort'), ['code', 'sequence', 'created_at'], true) ? $request->query('sort') : 'code';
        $query->orderBy($sort, $request->query('dir') === 'desc' ? 'desc' : 'asc');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            LocationResource::class,
        );
    }

    public function show(Request $request, Location $location): JsonResponse
    {
        $this->assertVisible($request, $location);

        return ApiResponse::resource(new LocationResource(
            $location->load(['facility', 'zone', 'blockedReason'])->loadCount('locationInventory'),
        ));
    }

    public function store(LocationRequest $request): JsonResponse
    {
        $location = $this->service->create($request->validated());

        return ApiResponse::resource(new LocationResource($location->load(['facility', 'zone'])), 201);
    }

    public function update(LocationRequest $request, Location $location): JsonResponse
    {
        $this->assertVisible($request, $location);
        $updated = $this->service->update($location, $request->validated());

        return ApiResponse::resource(new LocationResource($updated->load(['facility', 'zone', 'blockedReason'])));
    }

    public function setActive(Request $request, Location $location): JsonResponse
    {
        $this->assertVisible($request, $location);
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $updated = $this->service->setActive($location, $data['is_active']);

        return ApiResponse::resource(new LocationResource($updated->load(['facility', 'zone', 'blockedReason'])));
    }

    public function block(Request $request, Location $location): JsonResponse
    {
        $this->assertVisible($request, $location);
        $data = $request->validate([
            'reason_code_id' => ['required', 'integer'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $updated = $this->service->block($location, (int) $data['reason_code_id'], $data['remarks'] ?? null);

        return ApiResponse::resource(new LocationResource($updated->load(['facility', 'zone', 'blockedReason'])));
    }

    public function unblock(Request $request, Location $location): JsonResponse
    {
        $this->assertVisible($request, $location);
        $updated = $this->service->unblock($location);

        return ApiResponse::resource(new LocationResource($updated->load(['facility', 'zone'])));
    }

    public function destroy(Request $request, Location $location): JsonResponse
    {
        $this->assertVisible($request, $location);
        $this->service->delete($location);

        return ApiResponse::success(['deleted' => true]);
    }

    private function assertVisible(Request $request, Location $location): void
    {
        if (! $request->user()->canAccessFacility($location->facility_id)) {
            throw BusinessRuleException::outOfScope();
        }
    }
}
