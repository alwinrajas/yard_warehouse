<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventory\HoldService;
use App\Http\Controllers\Controller;
use App\Http\Resources\HoldResource;
use App\Models\PalletHold;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HoldController extends Controller
{
    public function __construct(private readonly HoldService $holds) {}

    public function index(Request $request): JsonResponse
    {
        $query = PalletHold::query()->with(['pallet', 'reasonCode', 'placedBy']);

        $state = $request->query('state', 'open');
        if ($state === 'open') {
            $query->where('is_open', true);
        } elseif ($state === 'released') {
            $query->where('is_open', false);
        }

        if ($type = $request->query('hold_type')) {
            $query->where('hold_type', $type);
        }
        if ($search = $request->query('search')) {
            $query->whereHas('pallet', fn ($q) => $q
                ->where('pallet_number', 'like', "%{$search}%")
                ->orWhere('job_number', 'like', "%{$search}%"));
        }

        $query->orderByDesc('placed_at');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            HoldResource::class,
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pallet_id' => ['required', 'integer'],
            'hold_type' => ['required', 'in:HOLD,DAMAGED,EXCEPTION'],
            'reason_code_id' => ['required', 'integer'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $hold = $this->holds->place(
            (int) $data['pallet_id'],
            $data['hold_type'],
            (int) $data['reason_code_id'],
            $data['remarks'] ?? null,
        );

        return ApiResponse::resource(new HoldResource($hold->load(['pallet', 'reasonCode', 'placedBy'])), 201);
    }

    public function release(Request $request, PalletHold $hold): JsonResponse
    {
        $data = $request->validate([
            'reason_code_id' => ['nullable', 'integer'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $released = $this->holds->release($hold->id, $data['reason_code_id'] ?? null, $data['remarks'] ?? null);

        return ApiResponse::resource(new HoldResource($released->load(['pallet', 'reasonCode', 'placedBy'])));
    }
}
