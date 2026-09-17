<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    /** Liveness. */
    public function health(): JsonResponse
    {
        return ApiResponse::success(['status' => 'ok']);
    }

    /** Readiness: the database is reachable and migrations are current. */
    public function ready(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $pending = ! DB::table('migrations')->exists();
        } catch (\Throwable) {
            return ApiResponse::error('NOT_READY', 'The service is not ready.', 503);
        }

        return ApiResponse::success(['status' => $pending ? 'migrations_pending' : 'ready']);
    }
}
