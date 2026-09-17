<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Masters\SiteService;
use App\Http\Controllers\Controller;
use App\Http\Requests\SiteRequest;
use App\Http\Resources\SiteResource;
use App\Models\Site;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteController extends Controller
{
    public function __construct(private readonly SiteService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Site::query()->withCount('facilities');

        // A user pinned to one site only ever sees that site (docs/07 §4).
        if ($request->user()->site_id !== null) {
            $query->whereKey($request->user()->site_id);
        }

        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('code', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
        }

        if (($status = $request->query('status')) !== null && $status !== 'all') {
            $query->where('is_active', $status === 'active');
        }

        $sort = in_array($request->query('sort'), ['code', 'name', 'created_at'], true) ? $request->query('sort') : 'code';
        $query->orderBy($sort, $request->query('dir') === 'desc' ? 'desc' : 'asc');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            SiteResource::class,
        );
    }

    public function show(Site $site): JsonResponse
    {
        return ApiResponse::resource(new SiteResource($site->loadCount('facilities')));
    }

    public function store(SiteRequest $request): JsonResponse
    {
        return ApiResponse::resource(new SiteResource($this->service->create($request->validated())), 201);
    }

    public function update(SiteRequest $request, Site $site): JsonResponse
    {
        return ApiResponse::resource(new SiteResource($this->service->update($site, $request->validated())));
    }

    public function setActive(Request $request, Site $site): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);

        return ApiResponse::resource(new SiteResource($this->service->setActive($site, $data['is_active'])));
    }

    public function destroy(Site $site): JsonResponse
    {
        $this->service->delete($site);

        return ApiResponse::success(['deleted' => true]);
    }
}
