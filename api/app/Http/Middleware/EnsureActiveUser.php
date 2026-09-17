<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Deactivating a user must end their session immediately, not at next token
 * expiry (docs/09 §3). Checked per request rather than trusted from the token.
 */
class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ! $user->is_active) {
            $user->tokens()->delete();

            return ApiResponse::error('ACCOUNT_INACTIVE', 'This account is inactive.', 401);
        }

        return $next($request);
    }
}
