<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\TransactionResource;
use App\Models\AuditLog;
use App\Models\InventoryTransaction;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = InventoryTransaction::query()
            ->with(['pallet', 'user', 'sourceLocation', 'destinationLocation', 'reasonCode']);

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($user = $request->query('user_id')) {
            $query->where('user_id', $user);
        }
        if ($channel = $request->query('channel')) {
            $query->where('channel', $channel);
        }
        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', $to.' 23:59:59');
        }
        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q
                ->where('txn_ref', 'like', "%{$search}%")
                ->orWhereHas('pallet', fn ($p) => $p
                    ->where('pallet_number', 'like', "%{$search}%")
                    ->orWhere('job_number', 'like', "%{$search}%")));
        }

        // A PDA operator sees only their own activity (docs/07 §3.5).
        if (! $request->user()->hasPermission('audit.view') && $request->user()->role?->code === 'PDA_OPERATOR') {
            $query->where('user_id', $request->user()->id);
        }

        $query->orderByDesc('created_at')->orderByDesc('id');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            TransactionResource::class,
        );
    }

    public function show(InventoryTransaction $transaction): JsonResponse
    {
        return ApiResponse::resource(new TransactionResource(
            $transaction->load(['pallet', 'user', 'sourceLocation', 'destinationLocation', 'reasonCode', 'dispatchDetail']),
        ));
    }

    /** Non-inventory audit events (master changes, logins, overrides, reprints). */
    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with('user');

        if ($event = $request->query('event')) {
            $query->where('event', 'like', "{$event}%");
        }
        if ($user = $request->query('user_id')) {
            $query->where('user_id', $user);
        }
        if ($entity = $request->query('entity_type')) {
            $query->where('auditable_type', 'like', "%{$entity}");
        }
        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', $to.' 23:59:59');
        }

        $query->orderByDesc('created_at')->orderByDesc('id');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            AuditLogResource::class,
        );
    }
}
