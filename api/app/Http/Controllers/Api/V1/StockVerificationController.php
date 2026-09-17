<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventory\StockVerificationService;
use App\Http\Controllers\Controller;
use App\Http\Resources\StockVerificationResource;
use App\Models\StockVerification;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockVerificationController extends Controller
{
    public function __construct(private readonly StockVerificationService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = StockVerification::query()->with('location');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($location = $request->query('location_id')) {
            $query->where('location_id', $location);
        }

        $query->orderByDesc('started_at');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            StockVerificationResource::class,
        );
    }

    public function show(StockVerification $stockVerification): JsonResponse
    {
        return ApiResponse::resource(new StockVerificationResource(
            $stockVerification->load(['location', 'lines.pallet', 'lines.systemLocation']),
        ));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['location_id' => ['required', 'integer', 'exists:locations,id']]);

        return ApiResponse::resource(
            new StockVerificationResource($this->service->start((int) $data['location_id'])->load('location')),
            201,
        );
    }

    public function scan(Request $request, StockVerification $stockVerification): JsonResponse
    {
        $data = $request->validate(['pallet_barcode' => ['required', 'string', 'max:255']]);

        $this->service->scan($stockVerification->id, $data['pallet_barcode']);

        return ApiResponse::resource(new StockVerificationResource(
            $stockVerification->refresh()->load(['location', 'lines.pallet', 'lines.systemLocation']),
        ));
    }

    public function submit(StockVerification $stockVerification): JsonResponse
    {
        return ApiResponse::resource(new StockVerificationResource(
            $this->service->submit($stockVerification->id)->load(['location', 'lines.pallet']),
        ));
    }

    public function review(Request $request, StockVerification $stockVerification): JsonResponse
    {
        $data = $request->validate([
            'approve' => ['required', 'boolean'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        return ApiResponse::resource(new StockVerificationResource(
            $this->service->review($stockVerification->id, (bool) $data['approve'], $data['remarks'] ?? null)
                ->load(['location', 'lines.pallet']),
        ));
    }
}
