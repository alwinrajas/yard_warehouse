<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReasonCodeResource;
use App\Models\ReasonCode;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only in this increment. Reason-code administration is W-26 (U-14);
 * locations need the LOCATION_BLOCK list to block a location.
 */
class ReasonCodeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ReasonCode::query()->where('is_active', true);

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        return ApiResponse::success(
            ReasonCodeResource::collection($query->orderBy('name')->get())->resolve(),
        );
    }
}
