<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\InventoryResource;
use App\Models\Facility;
use App\Models\InventoryCurrent;
use App\Models\Location;
use App\Support\ApiResponse;
use App\Support\BusinessTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Live inventory and occupancy (docs/03 M9). */
class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $visible = Facility::query()->visibleTo($request->user())->pluck('id');

        // Eager loading throughout: the list renders pallet, customer, facility
        // and zone names, and an N+1 here would be 50+ queries per page.
        $query = InventoryCurrent::query()
            ->with(['pallet.customer', 'location', 'facility', 'zone', 'lastActionBy'])
            ->whereIn('facility_id', $visible);

        foreach (['facility_id', 'zone_id', 'location_id'] as $filter) {
            if ($value = $request->query($filter)) {
                $query->where($filter, $value);
            }
        }

        if ($search = $request->query('search')) {
            $query->whereHas('pallet', fn ($q) => $q
                ->where('pallet_number', 'like', "%{$search}%")
                ->orWhere('job_number', 'like', "%{$search}%")
                ->orWhere('lpo_number', 'like', "%{$search}%")
                ->orWhere('customer_name_raw', 'like', "%{$search}%"));
        }

        foreach (['job_number' => 'job_number', 'pallet_number' => 'pallet_number', 'lpo' => 'lpo_number'] as $param => $column) {
            if ($value = $request->query($param)) {
                $query->whereHas('pallet', fn ($q) => $q->where($column, 'like', "%{$value}%"));
            }
        }

        if ($status = $request->query('status')) {
            $query->whereHas('pallet', function ($q) use ($status) {
                in_array($status, ['ON_HOLD', 'DAMAGED', 'EXCEPTION'], true)
                    ? $q->where('block_state', $status)
                    : $q->where('lifecycle_status', $status)->where('block_state', 'NONE');
            });
        }

        // Ageing buckets are computed from putaway_at — first entry into the
        // yard, never reset by an internal move (docs/05 §6).
        if ($bucket = $request->query('ageing')) {
            [$min, $max] = match ($bucket) {
                'fresh' => [0, 7], 'normal' => [8, 15], 'attention' => [16, 30], 'critical' => [31, null],
                default => [null, null],
            };
            if ($min !== null) {
                $query->where('putaway_at', '<=', now()->subDays($min)->endOfDay());
            }
            if ($max !== null) {
                $query->where('putaway_at', '>=', now()->subDays($max)->startOfDay());
            }
        }

        $sort = in_array($request->query('sort'), ['putaway_at', 'stored_at'], true) ? $request->query('sort') : 'putaway_at';
        $query->orderBy($sort, $request->query('dir') === 'asc' ? 'asc' : 'desc');

        return ApiResponse::paginated(
            $query->paginate(min((int) $request->query('pageSize', 50), 200)),
            InventoryResource::class,
        );
    }

    /** The zone board: every location with its occupancy (docs/23 §6). */
    public function occupancy(Request $request): JsonResponse
    {
        $visible = Facility::query()->visibleTo($request->user())->pluck('id');

        $query = Location::query()
            ->with(['facility:id,name,code', 'zone:id,name,code,sequence', 'blockedReason:id,name'])
            ->whereIn('facility_id', $visible)
            ->withCount(['locationInventory as pallet_count'])
            ->withMin('locationInventory as oldest_putaway_at', 'putaway_at');

        if ($facility = $request->query('facility_id')) {
            $query->where('facility_id', $facility);
        }
        if ($zone = $request->query('zone_id')) {
            $query->where('zone_id', $zone);
        }
        if ($search = $request->query('search')) {
            $query->where('code', 'like', "%{$search}%");
        }

        $locations = $query->orderBy('facility_id')->orderBy('zone_id')->orderBy('sequence')->orderBy('code')->get();

        $ageingThreshold = now()->subDays((int) config('alutrack.ageing_alert_days', 30));

        $cells = $locations->map(function (Location $location) use ($ageingThreshold) {
            $count = (int) ($location->pallet_count ?? 0);
            $state = match (true) {
                ! $location->is_active => 'inactive',
                $location->is_blocked => 'blocked',
                $count === 0 => 'empty',
                $location->capacity !== null && $count >= $location->capacity => 'full',
                default => 'occupied',
            };

            return [
                'id' => (string) $location->id,
                'code' => $location->code,
                'facility_id' => (string) $location->facility_id,
                'facility_name' => $location->facility?->name,
                'zone_id' => $location->zone_id !== null ? (string) $location->zone_id : null,
                'zone_name' => $location->zone?->name,
                'state' => $state,
                'pallet_count' => $count,
                'capacity' => $location->capacity,
                'is_blocked' => $location->is_blocked,
                'blocked_reason' => $location->blockedReason?->name,
                'has_ageing_stock' => $location->oldest_putaway_at !== null
                    && $location->oldest_putaway_at < $ageingThreshold->toDateTimeString(),
            ];
        });

        return ApiResponse::success([
            'locations' => $cells->values(),
            'summary' => [
                'total' => $cells->count(),
                'occupied' => $cells->whereIn('state', ['occupied', 'full'])->count(),
                'empty' => $cells->where('state', 'empty')->count(),
                'blocked' => $cells->where('state', 'blocked')->count(),
                'inactive' => $cells->where('state', 'inactive')->count(),
            ],
        ]);
    }

    /** Pallets currently recorded at one location (PDA location enquiry). */
    public function atLocation(Request $request, Location $location): JsonResponse
    {
        if (! $request->user()->canAccessFacility($location->facility_id)) {
            return ApiResponse::error('FACILITY_OUT_OF_SCOPE', 'This location is outside your facilities.', 403);
        }

        $rows = InventoryCurrent::with(['pallet.customer', 'location', 'facility', 'zone', 'lastActionBy'])
            ->where('location_id', $location->id)
            ->orderBy('putaway_at')
            ->get();

        return ApiResponse::success([
            'location' => [
                'id' => (string) $location->id,
                'code' => $location->code,
                'facility_name' => $location->facility?->name,
                'zone_name' => $location->zone?->name,
                'capacity' => $location->capacity,
                'is_blocked' => $location->is_blocked,
                'is_active' => $location->is_active,
            ],
            'pallets' => InventoryResource::collection($rows)->resolve(),
        ]);
    }

    /** Dashboard KPIs (BRD §23). */
    public function dashboard(Request $request): JsonResponse
    {
        $visible = Facility::query()->visibleTo($request->user())->pluck('id');
        // The business day, not the UTC one: a dispatch at 21:30 in a UTC+4
        // yard belongs to that local day, and would otherwise land in tomorrow
        // (CFG-13).
        $today = BusinessTime::startOfToday();

        $base = InventoryCurrent::whereIn('facility_id', $visible);

        $byFacilityType = (clone $base)
            ->join('facilities', 'inventory_current.facility_id', '=', 'facilities.id')
            ->select('facilities.type', DB::raw('COUNT(*) as total'))
            ->groupBy('facilities.type')
            ->pluck('total', 'type');

        $byFacility = (clone $base)
            ->join('facilities', 'inventory_current.facility_id', '=', 'facilities.id')
            ->select('facilities.name', DB::raw('COUNT(*) as total'))
            ->groupBy('facilities.name')
            ->orderByDesc('total')
            ->get();

        $txnToday = fn (string $type) => DB::table('inventory_transactions')
            ->where('type', $type)->where('created_at', '>=', $today)->count();

        $buckets = config('alutrack.ageing_buckets', [7, 15, 30]);
        $ageing = [
            'fresh' => (clone $base)->where('putaway_at', '>', now()->subDays($buckets[0]))->count(),
            'normal' => (clone $base)->whereBetween('putaway_at', [now()->subDays($buckets[1]), now()->subDays($buckets[0])])->count(),
            'attention' => (clone $base)->whereBetween('putaway_at', [now()->subDays($buckets[2]), now()->subDays($buckets[1])])->count(),
            'critical' => (clone $base)->where('putaway_at', '<', now()->subDays($buckets[2]))->count(),
        ];

        $locations = Location::whereIn('facility_id', $visible);
        $occupiedIds = InventoryCurrent::whereIn('facility_id', $visible)->distinct()->pluck('location_id');

        return ApiResponse::success([
            'kpis' => [
                'total_active' => (clone $base)->count(),
                'open_yard' => (int) ($byFacilityType['OPEN_YARD'] ?? 0),
                'closed_warehouse' => (int) ($byFacilityType['CLOSED_WAREHOUSE'] ?? 0),
                'today_putaway' => $txnToday('PUTAWAY'),
                'today_transfers' => $txnToday('TRANSFER'),
                'today_dispatch' => $txnToday('DISPATCH'),
                'occupied_locations' => $occupiedIds->count(),
                'empty_locations' => max(0, (clone $locations)->where('is_active', true)->count() - $occupiedIds->count()),
                'ageing_over_threshold' => $ageing['critical'],
                'holds_exceptions' => DB::table('pallet_holds')->where('is_open', true)->count(),
                'blocked_locations' => (clone $locations)->where('is_blocked', true)->count(),
            ],
            'by_facility' => $byFacility,
            'by_status' => (clone $base)
                ->join('pallets', 'inventory_current.pallet_id', '=', 'pallets.id')
                ->select(DB::raw("CASE WHEN pallets.block_state <> 'NONE' THEN pallets.block_state ELSE pallets.lifecycle_status END as status"), DB::raw('COUNT(*) as total'))
                ->groupBy('status')
                ->get(),
            'ageing' => $ageing,
            'oldest_awaiting_dispatch' => InventoryResource::collection(
                (clone $base)->with(['pallet.customer', 'location', 'facility', 'zone', 'lastActionBy'])
                    ->orderBy('putaway_at')->limit(10)->get(),
            )->resolve(),
        ]);
    }
}
