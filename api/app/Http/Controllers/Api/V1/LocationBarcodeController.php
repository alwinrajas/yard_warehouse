<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Masters\LocationBarcodeService;
use App\Http\Controllers\Controller;
use App\Http\Resources\LocationBarcodeResource;
use App\Models\Facility;
use App\Models\Location;
use App\Models\LocationBarcode;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Location barcode management (docs/23 W-23b).
 *
 * There is no "regenerate" endpoint. A reprint reproduces the same value and
 * increments a counter — location identity is permanent (LB-03).
 */
class LocationBarcodeController extends Controller
{
    public function __construct(private readonly LocationBarcodeService $service) {}

    public function index(Request $request): JsonResponse
    {
        $visible = Facility::query()->visibleTo($request->user())->pluck('id');

        $query = LocationBarcode::query()
            ->with(['location.facility', 'location.zone'])
            ->whereHas('location', fn ($q) => $q->whereIn('facility_id', $visible));

        if ($facility = $request->query('facility_id')) {
            $query->whereHas('location', fn ($q) => $q->where('facility_id', $facility));
        }
        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q
                ->where('barcode_value', 'like', "%{$search}%")
                ->orWhereHas('location', fn ($l) => $l->where('code', 'like', "%{$search}%")));
        }

        $query->orderBy('barcode_value');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            LocationBarcodeResource::class,
        );
    }

    /** Idempotent: a location that already has an identity keeps it. */
    public function generate(Request $request, Location $location): JsonResponse
    {
        if (! $request->user()->canAccessFacility($location->facility_id)) {
            return ApiResponse::error('FACILITY_OUT_OF_SCOPE', 'This location is outside your facilities.', 403);
        }

        $barcode = $this->service->generate($location);

        return ApiResponse::resource(new LocationBarcodeResource($barcode->load('location.facility', 'location.zone')), 201);
    }

    /** Generates identities for every location in a facility that lacks one. */
    public function generateMissing(Request $request): JsonResponse
    {
        $data = $request->validate(['facility_id' => ['required', 'integer', 'exists:facilities,id']]);

        if (! $request->user()->canAccessFacility((int) $data['facility_id'])) {
            return ApiResponse::error('FACILITY_OUT_OF_SCOPE', 'That facility is outside your access.', 403);
        }

        $locations = Location::where('facility_id', $data['facility_id'])
            ->whereDoesntHave('barcode')
            ->get();

        foreach ($locations as $location) {
            $this->service->generate($location);
        }

        return ApiResponse::success(['generated' => $locations->count()]);
    }

    public function print(Request $request): JsonResponse
    {
        $data = $request->validate([
            'location_ids' => ['required', 'array', 'min:1', 'max:500'],
            'location_ids.*' => ['integer'],
        ]);

        $barcodes = LocationBarcode::with('location.facility', 'location.zone')
            ->whereIn('location_id', $data['location_ids'])
            ->get();

        foreach ($barcodes as $barcode) {
            $this->service->markPrinted($barcode);
        }

        return ApiResponse::success([
            'printed' => $barcodes->count(),
            'labels' => LocationBarcodeResource::collection($barcodes)->resolve(),
        ]);
    }

    public function reprint(Request $request, LocationBarcode $locationBarcode): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        $before = $locationBarcode->barcode_value;
        $barcode = $this->service->reprint($locationBarcode, $data['reason'] ?? null);

        return ApiResponse::success([
            'barcode' => (new LocationBarcodeResource($barcode->load('location.facility', 'location.zone')))->resolve(),
            // Echoed so the client can assert identity was preserved.
            'identity_preserved' => $barcode->barcode_value === $before,
        ]);
    }
}
