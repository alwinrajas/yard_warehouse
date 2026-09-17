<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\HoldResource;
use App\Http\Resources\PalletResource;
use App\Http\Resources\TransactionResource;
use App\Models\Pallet;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PalletController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Pallet::query()->with(['customer', 'current.location', 'current.facility', 'current.zone']);

        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q
                ->where('pallet_number', 'like', "%{$search}%")
                ->orWhere('job_number', 'like', "%{$search}%")
                ->orWhere('lpo_number', 'like', "%{$search}%")
                ->orWhere('customer_name_raw', 'like', "%{$search}%"));
        }

        if ($job = $request->query('job_number')) {
            $query->where('job_number', $job);
        }
        if ($status = $request->query('status')) {
            $query->where('lifecycle_status', $status);
        }
        if ($request->query('include_dispatched') !== 'true') {
            $query->where('lifecycle_status', '!=', 'DISPATCHED');
        }

        $query->orderByDesc('last_movement_at')->orderByDesc('id');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            PalletResource::class,
        );
    }

    public function show(Pallet $pallet): JsonResponse
    {
        return ApiResponse::resource(new PalletResource(
            $pallet->load(['customer', 'current.location', 'current.facility', 'current.zone']),
        ));
    }

    /** Complete lifecycle, oldest first (FR-016). Corrections link to what they corrected. */
    public function history(Pallet $pallet): JsonResponse
    {
        $transactions = $pallet->transactions()
            ->with(['user', 'sourceLocation', 'destinationLocation', 'reasonCode', 'pallet'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return ApiResponse::success([
            'pallet' => (new PalletResource($pallet->load(['customer', 'current.location', 'current.facility', 'current.zone'])))->resolve(),
            'timeline' => TransactionResource::collection($transactions)->resolve(),
            'holds' => HoldResource::collection(
                $pallet->holds()->with(['reasonCode', 'placedBy', 'pallet'])->orderByDesc('placed_at')->get(),
            )->resolve(),
        ]);
    }

    /** Unified search across pallet, job, customer and LPO (BRD §9.4). */
    public function search(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));

        if (mb_strlen($term) < 2) {
            return ApiResponse::success(['pallets' => [], 'jobs' => []]);
        }

        $pallets = Pallet::with(['customer', 'current.location', 'current.facility', 'current.zone'])
            ->where(fn ($q) => $q
                ->where('pallet_number', 'like', "%{$term}%")
                ->orWhere('job_number', 'like', "%{$term}%")
                ->orWhere('lpo_number', 'like', "%{$term}%")
                ->orWhere('customer_name_raw', 'like', "%{$term}%"))
            ->limit(25)
            ->get();

        return ApiResponse::success([
            'pallets' => PalletResource::collection($pallets)->resolve(),
            'jobs' => $pallets->whereNotNull('job_number')->groupBy('job_number')->map(fn ($group, $job) => [
                'job_number' => $job,
                'total' => $group->count(),
                'stored' => $group->where('lifecycle_status', 'STORED')->count(),
                'dispatched' => $group->where('lifecycle_status', 'DISPATCHED')->count(),
            ])->values(),
        ]);
    }
}
