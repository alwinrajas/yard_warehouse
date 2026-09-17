<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The single response envelope (docs/02 §8).
 *
 * Every endpoint returns this shape so both clients have one parser and one
 * error path. No controller builds a response any other way.
 */
final class ApiResponse
{
    /** @param  mixed  $data */
    public static function success($data = null, int $status = 200, array $meta = []): JsonResponse
    {
        $payload = ['success' => true, 'data' => $data];
        if ($meta !== []) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    public static function paginated(LengthAwarePaginator $paginator, string $resource): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $resource::collection($paginator->items())->resolve(),
            'meta' => [
                'pagination' => [
                    'page' => $paginator->currentPage(),
                    'pageSize' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'lastPage' => $paginator->lastPage(),
                ],
            ],
        ]);
    }

    public static function error(
        string $code,
        string $message,
        int $status = 400,
        array $details = [],
        ?string $traceId = null,
    ): JsonResponse {
        $error = ['code' => $code, 'message' => $message];
        if ($details !== []) {
            $error['details'] = $details;
        }
        $error['trace_id'] = $traceId ?? (string) (request()->attributes->get('correlation_id') ?? '');
        if ($error['trace_id'] === '') {
            unset($error['trace_id']);
        }

        return response()->json(['success' => false, 'error' => $error], $status);
    }

    public static function resource(JsonResource $resource, int $status = 200): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $resource->resolve()], $status);
    }
}
