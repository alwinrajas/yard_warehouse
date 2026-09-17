<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventory\CorrectionService;
use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionResource;
use App\Models\InventoryTransaction;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CorrectionController extends Controller
{
    public function __construct(private readonly CorrectionService $corrections) {}

    /** The corrections register — read-only (docs/23 §9). */
    public function index(Request $request): JsonResponse
    {
        $query = InventoryTransaction::query()
            ->with(['pallet', 'user', 'sourceLocation', 'destinationLocation', 'reasonCode'])
            ->where('type', 'CORRECTION');

        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q
                ->where('txn_ref', 'like', "%{$search}%")
                ->orWhereHas('pallet', fn ($p) => $p->where('pallet_number', 'like', "%{$search}%")));
        }

        $query->orderByDesc('created_at');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            TransactionResource::class,
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'original_transaction_id' => ['required', 'integer', 'exists:inventory_transactions,id'],
            'type' => ['required', 'in:'.implode(',', CorrectionService::TYPES)],
            'reason_code_id' => ['required', 'integer'],
            'justification' => ['required', 'string', 'min:10', 'max:500'],
            'location_id' => ['nullable', 'integer', 'exists:locations,id'],
            'lifecycle_status' => ['nullable', 'string'],
            'block_state' => ['nullable', 'in:NONE,ON_HOLD,DAMAGED,EXCEPTION'],
        ]);

        $txn = $this->corrections->perform($data);

        return ApiResponse::resource(new TransactionResource(
            $txn->load(['pallet', 'user', 'sourceLocation', 'destinationLocation', 'reasonCode']),
        ), 201);
    }
}
