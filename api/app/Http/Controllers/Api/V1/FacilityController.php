<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Masters\FacilityService;
use App\Http\Controllers\Controller;
use App\Http\Requests\FacilityRequest;
use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use App\Support\ApiResponse;
use App\Support\BusinessRuleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityController extends Controller
{
    public function __construct(private readonly FacilityService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Facility::query()
            ->with('site')
            ->withCount(['zones', 'locations'])
            ->visibleTo($request->user());

        if ($siteId = $request->query('site_id')) {
            $query->where('site_id', $siteId);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('code', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
        }

        if (($status = $request->query('status')) !== null && $status !== 'all') {
            $query->where('is_active', $status === 'active');
        }

        $sort = in_array($request->query('sort'), ['code', 'name', 'type', 'created_at'], true) ? $request->query('sort') : 'code';
        $query->orderBy($sort, $request->query('dir') === 'desc' ? 'desc' : 'asc');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            FacilityResource::class,
        );
    }

    public function show(Request $request, Facility $facility): JsonResponse
    {
        $this->assertVisible($request, $facility);

        return ApiResponse::resource(new FacilityResource($facility->load('site')->loadCount(['zones', 'locations'])));
    }

    public function store(FacilityRequest $request): JsonResponse
    {
        $facility = $this->service->create($request->validated());

        return ApiResponse::resource(new FacilityResource($facility->load('site')), 201);
    }

    public function update(FacilityRequest $request, Facility $facility): JsonResponse
    {
        $this->assertVisible($request, $facility);
        $updated = $this->service->update($facility, $request->validated());

        return ApiResponse::resource(new FacilityResource($updated->load('site')));
    }

    public function setActive(Request $request, Facility $facility): JsonResponse
    {
        $this->assertVisible($request, $facility);
        $data = $request->validate(['is_active' => ['required', 'boolean']]);

        return ApiResponse::resource(new FacilityResource($this->service->setActive($facility, $data['is_active'])->load('site')));
    }

    public function destroy(Request $request, Facility $facility): JsonResponse
    {
        $this->assertVisible($request, $facility);
        $this->service->delete($facility);

        return ApiResponse::success(['deleted' => true]);
    }

    /**
     * Out of scope returns the same shape as "not permitted" so scope cannot be
     * used to probe for facilities the user may not see (docs/07 §4 rule SC-05).
     */
    private function assertVisible(Request $request, Facility $facility): void
    {
        if (! $request->user()->canAccessFacility($facility->id)) {
            throw BusinessRuleException::outOfScope();
        }
    }
}
