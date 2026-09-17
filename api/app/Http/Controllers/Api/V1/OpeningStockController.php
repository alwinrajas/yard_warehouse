<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventory\OpeningStockService;
use App\Http\Controllers\Controller;
use App\Http\Resources\LocationResource;
use App\Http\Resources\PalletResource;
use App\Http\Resources\TransactionResource;
use App\Models\InventoryTransaction;
use App\Support\ApiResponse;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Opening stock (S-42, FR-035).
 *
 * A thin controller over OpeningStockService — every rule lives in the domain,
 * because this endpoint writes live inventory and must not be a second, looser
 * way of doing so.
 */
class OpeningStockController extends Controller
{
    public function __construct(private readonly OpeningStockService $service) {}

    /** Status and what has been captured so far, so the screen can be honest about progress. */
    public function status(): JsonResponse
    {
        $captured = InventoryTransaction::where('type', 'OPENING_STOCK')->count();
        $latest = InventoryTransaction::where('type', 'OPENING_STOCK')
            ->with(['pallet', 'destinationLocation', 'user'])
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return ApiResponse::success([
            'enabled' => Settings::bool('openingstock.mode_enabled'),
            'setting_reference' => 'CFG-17',
            'captured_count' => $captured,
            'recent' => TransactionResource::collection($latest)->resolve(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'location_barcode' => ['required', 'string', 'max:255'],
            'pallet_barcode' => ['required', 'string', 'max:255'],
            'stored_since' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $this->service->capture(
            $data['location_barcode'],
            $data['pallet_barcode'],
            [
                'stored_since' => $data['stored_since'] ?? null,
                'remarks' => $data['remarks'] ?? null,
                'idempotency_key' => $request->header('Idempotency-Key'),
            ],
        );

        return ApiResponse::success([
            'transaction' => (new TransactionResource($result['transaction']))->resolve(),
            'pallet' => (new PalletResource($result['pallet']->load('current.location')))->resolve(),
            'location' => (new LocationResource($result['location']->load(['facility', 'zone'])))->resolve(),
        ], 201);
    }
}
