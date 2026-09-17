<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Support\ApiResponse;
use App\Support\BusinessRuleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * MIS reports (BRD §14, docs/10).
 *
 * One endpoint, thirteen declarative definitions. Each is a query object with a
 * fixed column set; none hydrates models, and all are scoped and paginated.
 */
class ReportController extends Controller
{
    /**
     * Report slug to the permission that grants it (docs/07 §4).
     *
     * Each report is granted separately: operator activity and traceability are
     * management views, and a role allowed to read current inventory must not
     * inherit them. The route cannot express this, so it is enforced here.
     */
    private const REPORTS = [
        'current-inventory' => 'report.view.current_inventory',
        'location-stock' => 'report.view.location_stock',
        'job-pallet' => 'report.view.job_pallet',
        'customer-stock' => 'report.view.customer_lpo_stock',
        'put-away' => 'report.view.putaway_register',
        'movement' => 'report.view.movement_register',
        'dispatch' => 'report.view.dispatch_register',
        'traceability' => 'report.view.pallet_traceability',
        'ageing' => 'report.view.ageing',
        'operator-activity' => 'report.view.operator_activity',
        'stock-verification' => 'report.view.verification_variance',
        'holds' => 'report.view.hold_exception',
        'daily-movement' => 'report.view.daily_movement_summary',
    ];

    public function show(Request $request, string $report): JsonResponse
    {
        // An unknown report and a forbidden one answer identically, so the
        // endpoint cannot be used to enumerate what exists (docs/09 §5).
        if (! array_key_exists($report, self::REPORTS)
            || ! $request->user()->hasPermission(self::REPORTS[$report])) {
            throw new BusinessRuleException('UNKNOWN_REPORT', 'That report does not exist, or you are not permitted to view it.', 404);
        }

        $visible = Facility::query()->visibleTo($request->user())->pluck('id');
        $page = max(1, (int) $request->query('page', 1));
        $size = min((int) $request->query('pageSize', 50), 200);
        $from = $request->query('from');
        $to = $request->query('to');

        [$rows, $total, $summary] = match ($report) {
            'current-inventory', 'ageing' => $this->inventoryRows($request, $visible, $page, $size, $report === 'ageing'),
            'location-stock' => $this->locationStock($visible, $page, $size),
            'job-pallet' => $this->jobPallet($request, $page, $size),
            'customer-stock' => $this->customerStock($visible, $page, $size),
            'put-away', 'movement', 'dispatch' => $this->register($report, $visible, $from, $to, $page, $size),
            'traceability' => $this->traceability($request, $page, $size),
            'operator-activity' => $this->operatorActivity($from, $to, $page, $size),
            'stock-verification' => $this->verificationVariance($page, $size),
            'holds' => $this->holds($page, $size),
            'daily-movement' => $this->dailyMovement($from, $to),
            default => [[], 0, []],
        };

        return ApiResponse::success(
            ['report' => $report, 'rows' => $rows, 'summary' => $summary],
            200,
            ['pagination' => ['page' => $page, 'pageSize' => $size, 'total' => $total]],
        );
    }

    private function paginate($query, int $page, int $size): array
    {
        $total = (clone $query)->count();
        $rows = $query->forPage($page, $size)->get()->map(fn ($r) => (array) $r)->values();

        return [$rows, $total];
    }

    private function inventoryRows(Request $request, $visible, int $page, int $size, bool $ageing): array
    {
        $query = DB::table('inventory_current as ic')
            ->join('pallets as p', 'p.id', '=', 'ic.pallet_id')
            ->join('locations as l', 'l.id', '=', 'ic.location_id')
            ->join('facilities as f', 'f.id', '=', 'ic.facility_id')
            ->leftJoin('zones as z', 'z.id', '=', 'ic.zone_id')
            ->leftJoin('customers as c', 'c.id', '=', 'p.customer_id')
            ->whereIn('ic.facility_id', $visible)
            ->select([
                'p.pallet_number', 'p.job_number', 'p.lpo_number',
                DB::raw('COALESCE(c.name, p.customer_name_raw) as customer'),
                'f.name as facility', 'z.name as zone', 'l.code as location',
                DB::raw("CASE WHEN p.block_state <> 'NONE' THEN p.block_state ELSE p.lifecycle_status END as status"),
                'ic.putaway_at', DB::raw('DATEDIFF(NOW(), ic.putaway_at) as ageing_days'),
            ]);

        if ($facility = $request->query('facility_id')) {
            $query->where('ic.facility_id', $facility);
        }
        if ($minAge = $request->query('min_age')) {
            $query->whereRaw('DATEDIFF(NOW(), ic.putaway_at) >= ?', [(int) $minAge]);
        }

        $query->orderByDesc('ageing_days');
        [$rows, $total] = $this->paginate($query, $page, $size);

        $buckets = config('alutrack.ageing_buckets', [7, 15, 30]);
        $summary = $ageing ? [
            '0-7' => (clone $query)->whereRaw('DATEDIFF(NOW(), ic.putaway_at) <= ?', [$buckets[0]])->count(),
            '8-15' => (clone $query)->whereRaw('DATEDIFF(NOW(), ic.putaway_at) BETWEEN ? AND ?', [$buckets[0] + 1, $buckets[1]])->count(),
            '16-30' => (clone $query)->whereRaw('DATEDIFF(NOW(), ic.putaway_at) BETWEEN ? AND ?', [$buckets[1] + 1, $buckets[2]])->count(),
            '>30' => (clone $query)->whereRaw('DATEDIFF(NOW(), ic.putaway_at) > ?', [$buckets[2]])->count(),
        ] : ['total_pallets' => $total];

        return [$rows, $total, $summary];
    }

    private function locationStock($visible, int $page, int $size): array
    {
        $query = DB::table('locations as l')
            ->join('facilities as f', 'f.id', '=', 'l.facility_id')
            ->leftJoin('zones as z', 'z.id', '=', 'l.zone_id')
            ->leftJoin('inventory_current as ic', 'ic.location_id', '=', 'l.id')
            ->whereIn('l.facility_id', $visible)
            ->groupBy('l.id', 'l.code', 'f.name', 'z.name', 'l.capacity', 'l.is_active', 'l.is_blocked')
            ->select([
                'f.name as facility', 'z.name as zone', 'l.code as location', 'l.capacity',
                DB::raw('COUNT(ic.pallet_id) as pallet_count'),
                DB::raw("CASE WHEN l.is_active = 0 THEN 'Inactive' WHEN l.is_blocked = 1 THEN 'Blocked' WHEN COUNT(ic.pallet_id) = 0 THEN 'Empty' ELSE 'Occupied' END as state"),
                DB::raw('MIN(ic.putaway_at) as oldest_putaway'),
            ])
            ->orderBy('f.name')->orderBy('z.name')->orderBy('l.code');

        $total = DB::table('locations')->whereIn('facility_id', $visible)->count();
        $rows = $query->forPage($page, $size)->get()->map(fn ($r) => (array) $r)->values();

        return [$rows, $total, ['locations' => $total]];
    }

    private function jobPallet(Request $request, int $page, int $size): array
    {
        $query = DB::table('pallets as p')
            ->leftJoin('inventory_current as ic', 'ic.pallet_id', '=', 'p.id')
            ->leftJoin('locations as l', 'l.id', '=', 'ic.location_id')
            ->leftJoin('customers as c', 'c.id', '=', 'p.customer_id')
            ->whereNotNull('p.job_number')
            ->select([
                'p.job_number', 'p.pallet_number', DB::raw('COALESCE(c.name, p.customer_name_raw) as customer'),
                'p.lpo_number',
                DB::raw("CASE WHEN p.block_state <> 'NONE' THEN p.block_state ELSE p.lifecycle_status END as status"),
                'l.code as location', 'p.first_putaway_at', 'p.dispatched_at',
            ])
            ->orderBy('p.job_number')->orderBy('p.pallet_number');

        if ($job = $request->query('job_number')) {
            $query->where('p.job_number', 'like', "%{$job}%");
        }

        [$rows, $total] = $this->paginate($query, $page, $size);

        return [$rows, $total, ['pallets' => $total]];
    }

    private function customerStock($visible, int $page, int $size): array
    {
        $query = DB::table('inventory_current as ic')
            ->join('pallets as p', 'p.id', '=', 'ic.pallet_id')
            ->leftJoin('customers as c', 'c.id', '=', 'p.customer_id')
            ->whereIn('ic.facility_id', $visible)
            ->groupBy('customer', 'p.lpo_number')
            ->select([
                DB::raw("COALESCE(c.name, p.customer_name_raw, 'Not recorded') as customer"),
                'p.lpo_number',
                DB::raw('COUNT(*) as pallet_count'),
                DB::raw('MAX(DATEDIFF(NOW(), ic.putaway_at)) as oldest_ageing_days'),
            ])
            ->orderByDesc('pallet_count');

        $rows = $query->forPage($page, $size)->get()->map(fn ($r) => (array) $r)->values();

        return [$rows, $rows->count(), ['groups' => $rows->count()]];
    }

    private function register(string $report, $visible, ?string $from, ?string $to, int $page, int $size): array
    {
        $type = ['put-away' => 'PUTAWAY', 'movement' => 'TRANSFER', 'dispatch' => 'DISPATCH'][$report];

        $query = DB::table('inventory_transactions as t')
            ->join('pallets as p', 'p.id', '=', 't.pallet_id')
            ->join('users as u', 'u.id', '=', 't.user_id')
            ->leftJoin('locations as sl', 'sl.id', '=', 't.source_location_id')
            ->leftJoin('locations as dl', 'dl.id', '=', 't.destination_location_id')
            ->leftJoin('reason_codes as rc', 'rc.id', '=', 't.reason_code_id')
            ->where('t.type', $type)
            ->select([
                't.created_at', 't.txn_ref', 'p.job_number', 'p.pallet_number',
                'sl.code as source_location', 'dl.code as destination_location',
                'rc.name as reason', 't.remarks', 'u.name as operator', 't.channel', 't.device_id',
            ])
            ->orderByDesc('t.created_at');

        if ($from) {
            $query->where('t.created_at', '>=', $from);
        }
        if ($to) {
            $query->where('t.created_at', '<=', $to.' 23:59:59');
        }

        [$rows, $total] = $this->paginate($query, $page, $size);

        return [$rows, $total, ['transactions' => $total]];
    }

    private function traceability(Request $request, int $page, int $size): array
    {
        $pallet = $request->query('pallet_number');
        if (! $pallet) {
            return [[], 0, ['hint' => 'Select a pallet to trace.']];
        }

        $query = DB::table('inventory_transactions as t')
            ->join('pallets as p', 'p.id', '=', 't.pallet_id')
            ->join('users as u', 'u.id', '=', 't.user_id')
            ->leftJoin('locations as sl', 'sl.id', '=', 't.source_location_id')
            ->leftJoin('locations as dl', 'dl.id', '=', 't.destination_location_id')
            ->where('p.pallet_number', $pallet)
            ->select([
                't.created_at', 't.txn_ref', 't.type', 'sl.code as source_location',
                'dl.code as destination_location', 't.previous_lifecycle_status',
                't.new_lifecycle_status', 'u.name as operator', 't.channel', 't.remarks',
            ])
            ->orderBy('t.created_at');

        [$rows, $total] = $this->paginate($query, $page, $size);

        return [$rows, $total, ['pallet_number' => $pallet, 'events' => $total]];
    }

    private function operatorActivity(?string $from, ?string $to, int $page, int $size): array
    {
        $query = DB::table('inventory_transactions as t')
            ->join('users as u', 'u.id', '=', 't.user_id')
            ->groupBy('u.id', 'u.name')
            ->select([
                'u.name as operator',
                DB::raw("SUM(CASE WHEN t.type = 'PUTAWAY' THEN 1 ELSE 0 END) as put_aways"),
                DB::raw("SUM(CASE WHEN t.type = 'TRANSFER' THEN 1 ELSE 0 END) as transfers"),
                DB::raw("SUM(CASE WHEN t.type = 'DISPATCH' THEN 1 ELSE 0 END) as dispatches"),
                DB::raw("SUM(CASE WHEN t.type IN ('HOLD','RELEASE','MARK_DAMAGED') THEN 1 ELSE 0 END) as holds"),
                DB::raw('COUNT(*) as total'),
                DB::raw('MAX(t.created_at) as last_activity'),
            ])
            ->orderByDesc('total');

        if ($from) {
            $query->where('t.created_at', '>=', $from);
        }
        if ($to) {
            $query->where('t.created_at', '<=', $to.' 23:59:59');
        }

        $rows = $query->forPage($page, $size)->get()->map(fn ($r) => (array) $r)->values();

        return [$rows, $rows->count(), ['operators' => $rows->count()]];
    }

    private function verificationVariance(int $page, int $size): array
    {
        $query = DB::table('stock_verifications as sv')
            ->join('locations as l', 'l.id', '=', 'sv.location_id')
            ->join('users as u', 'u.id', '=', 'sv.started_by')
            ->select([
                'sv.reference', 'sv.started_at', 'l.code as location', 'sv.status',
                'sv.expected_count', 'sv.scanned_count', 'sv.matched_count',
                'sv.missing_count', 'sv.unexpected_count', 'u.name as operator',
            ])
            ->orderByDesc('sv.started_at');

        [$rows, $total] = $this->paginate($query, $page, $size);

        return [$rows, $total, ['sessions' => $total]];
    }

    private function holds(int $page, int $size): array
    {
        $query = DB::table('pallet_holds as h')
            ->join('pallets as p', 'p.id', '=', 'h.pallet_id')
            ->join('users as u', 'u.id', '=', 'h.placed_by')
            ->leftJoin('reason_codes as rc', 'rc.id', '=', 'h.reason_code_id')
            ->leftJoin('inventory_current as ic', 'ic.pallet_id', '=', 'p.id')
            ->leftJoin('locations as l', 'l.id', '=', 'ic.location_id')
            ->select([
                'p.pallet_number', 'p.job_number', 'h.hold_type', 'rc.name as reason',
                'h.remarks', 'l.code as location', 'u.name as placed_by', 'h.placed_at',
                'h.released_at', DB::raw('DATEDIFF(COALESCE(h.released_at, NOW()), h.placed_at) as days_held'),
                DB::raw("CASE WHEN h.is_open = 1 THEN 'Open' ELSE 'Released' END as state"),
            ])
            ->orderByDesc('h.placed_at');

        [$rows, $total] = $this->paginate($query, $page, $size);

        return [$rows, $total, ['holds' => $total]];
    }

    /** Opening + put-away − dispatch = closing, per day. */
    private function dailyMovement(?string $from, ?string $to): array
    {
        $rows = DB::table('inventory_transactions')
            ->selectRaw('DATE(created_at) as date')
            ->selectRaw("SUM(CASE WHEN type IN ('PUTAWAY','OPENING_STOCK') THEN 1 ELSE 0 END) as put_away")
            ->selectRaw("SUM(CASE WHEN type = 'TRANSFER' THEN 1 ELSE 0 END) as transfers")
            ->selectRaw("SUM(CASE WHEN type = 'DISPATCH' THEN 1 ELSE 0 END) as dispatched")
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to.' 23:59:59'))
            ->groupBy('date')
            ->orderByDesc('date')
            ->limit(90)
            ->get();

        $closing = DB::table('inventory_current')->count();
        $out = [];
        foreach ($rows as $row) {
            $opening = $closing - (int) $row->put_away + (int) $row->dispatched;
            $out[] = [
                'date' => $row->date,
                'opening' => $opening,
                'put_away' => (int) $row->put_away,
                'transfers' => (int) $row->transfers,
                'dispatched' => (int) $row->dispatched,
                'closing' => $closing,
                'reconciles' => $opening + (int) $row->put_away - (int) $row->dispatched === $closing,
            ];
            $closing = $opening;
        }

        return [$out, count($out), ['days' => count($out)]];
    }
}
