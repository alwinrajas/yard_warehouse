<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route-level permission gate (docs/07 §5).
 *
 * The client's permission list decides what to render; this decides what is
 * allowed. Frontend visibility is not security.
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if ($user === null) {
            return ApiResponse::error('UNAUTHENTICATED', 'Your session has ended.', 401);
        }

        if (! $user->hasPermission($permission)) {
            return ApiResponse::error(
                'PERMISSION_DENIED',
                'You do not have permission to perform this action.',
                403,
                ['required_permission' => $permission],
            );
        }

        return $next($request);
    }
}
