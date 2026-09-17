<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventory\DispatchService;
use App\Domain\Inventory\IdempotencyGuard;
use App\Domain\Inventory\LocationValidator;
use App\Domain\Inventory\PalletResolver;
use App\Domain\Inventory\PutAwayService;
use App\Domain\Inventory\TransferService;
use App\Http\Controllers\Controller;
use App\Http\Resources\LocationResource;
use App\Http\Resources\PalletResource;
use App\Http\Resources\TransactionResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Inventory operations (docs/03 M3–M5).
 *
 * Every mutating action is idempotent: a replay returns the ORIGINAL response,
 * so an operator whose connection dropped mid-confirm retries and gets the real
 * success rather than a false conflict (BR-08).
 */
class OperationsController extends Controller
{
    public function __construct(
        private readonly PutAwayService $putAway,
        private readonly TransferService $transfer,
        private readonly DispatchService $dispatch,
        private readonly LocationValidator $locations,
        private readonly PalletResolver $pallets,
        private readonly IdempotencyGuard $idempotency,
    ) {}

    /** Advisory pre-check so a bad scan is caught before the pallet is lifted (CC-08). */
    public function validateLocation(Request $request): JsonResponse
    {
        $data = $request->validate(['barcode' => ['required', 'string', 'max:255']]);

        $location = $this->locations->resolveByBarcode($data['barcode']);
        $this->locations->assertAcceptsInbound($location, $request->user());

        return ApiResponse::resource(new LocationResource($location->load(['facility', 'zone', 'blockedReason'])));
    }

    /** Resolves a scanned pallet label without committing anything. */
    public function resolvePallet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'barcode' => ['required', 'string', 'max:255'],
            'create' => ['sometimes', 'boolean'],
        ]);

        $pallet = $this->pallets->resolve($data['barcode'], (bool) ($data['create'] ?? false));

        return ApiResponse::resource(new PalletResource($pallet->load(['customer', 'current.location', 'current.facility', 'current.zone'])));
    }

    public function storePutAway(Request $request): JsonResponse
    {
        $data = $request->validate([
            'location_barcode' => ['required', 'string', 'max:255'],
            'pallet_barcode' => ['required', 'string', 'max:255'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        return $this->idempotent($request, 'putaway', $data, function () use ($request, $data) {
            $result = $this->putAway->perform($data['location_barcode'], $data['pallet_barcode'], [
                'remarks' => $data['remarks'] ?? null,
                'idempotency_key' => $request->header('Idempotency-Key'),
            ]);

            return ApiResponse::success([
                'transaction' => (new TransactionResource($result['transaction']))->resolve(),
                'pallet' => (new PalletResource($result['pallet']->load('current.location')))->resolve(),
                'location' => (new LocationResource($result['location']->load(['facility', 'zone'])))->resolve(),
            ], 201);
        });
    }

    public function storeMovement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pallet_barcode' => ['required', 'string', 'max:255'],
            'source_barcode' => ['nullable', 'string', 'max:255'],
            'destination_barcode' => ['required', 'string', 'max:255'],
            'reason_code_id' => ['nullable', 'integer'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        return $this->idempotent($request, 'movement', $data, function () use ($request, $data) {
            $result = $this->transfer->perform(
                $data['pallet_barcode'],
                $data['source_barcode'] ?? null,
                $data['destination_barcode'],
                [
                    'reason_code_id' => $data['reason_code_id'] ?? null,
                    'remarks' => $data['remarks'] ?? null,
                    'idempotency_key' => $request->header('Idempotency-Key'),
                ],
            );

            return ApiResponse::success([
                'transaction' => (new TransactionResource($result['transaction']))->resolve(),
                'pallet' => (new PalletResource($result['pallet']->load('current.location')))->resolve(),
                'from' => (new LocationResource($result['from']))->resolve(),
                'to' => (new LocationResource($result['to']))->resolve(),
            ], 201);
        });
    }

    public function storeDispatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pallet_barcode' => ['required', 'string', 'max:255'],
            'location_barcode' => ['nullable', 'string', 'max:255'],
            'delivery_reference' => ['nullable', 'string', 'max:80'],
            'vehicle_reference' => ['nullable', 'string', 'max:80'],
            'remarks' => ['nullable', 'string', 'max:500'],
            'override_hold' => ['sometimes', 'boolean'],
            'override_justification' => ['nullable', 'string', 'max:500'],
        ]);

        return $this->idempotent($request, 'dispatch', $data, function () use ($request, $data) {
            $result = $this->dispatch->perform($data['pallet_barcode'], $data['location_barcode'] ?? null, [
                'delivery_reference' => $data['delivery_reference'] ?? null,
                'vehicle_reference' => $data['vehicle_reference'] ?? null,
                'remarks' => $data['remarks'] ?? null,
                'override_hold' => $data['override_hold'] ?? false,
                'override_justification' => $data['override_justification'] ?? null,
                'idempotency_key' => $request->header('Idempotency-Key'),
            ]);

            return ApiResponse::success([
                'transaction' => (new TransactionResource($result['transaction']))->resolve(),
                'pallet' => (new PalletResource($result['pallet']))->resolve(),
            ], 201);
        });
    }

    public function storeStage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pallet_barcode' => ['required', 'string', 'max:255'],
            'staging_barcode' => ['required', 'string', 'max:255'],
        ]);

        return $this->idempotent($request, 'stage', $data, function () use ($request, $data) {
            $result = $this->dispatch->stage($data['pallet_barcode'], $data['staging_barcode'], [
                'idempotency_key' => $request->header('Idempotency-Key'),
            ]);

            return ApiResponse::success([
                'transaction' => (new TransactionResource($result['transaction']))->resolve(),
                'pallet' => (new PalletResource($result['pallet']))->resolve(),
            ], 201);
        });
    }

    private function idempotent(Request $request, string $endpoint, array $payload, callable $work): JsonResponse
    {
        $key = $request->header('Idempotency-Key');

        if ($key === null || $key === '') {
            return $work();
        }

        $replay = $this->idempotency->find($key, $endpoint, $payload);
        if ($replay !== null) {
            return $replay;
        }

        $response = $work();
        $this->idempotency->remember($key, $endpoint, $payload, $response);

        return $response;
    }
}
