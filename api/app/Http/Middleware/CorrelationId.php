<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Attaches a correlation id to every request so an error the user sees can be
 * tied to a log line without exposing anything internal (docs/02 §8).
 */
class CorrelationId
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = $request->header('X-Correlation-Id') ?: (string) Str::ulid();
        $request->attributes->set('correlation_id', $id);

        $response = $next($request);
        $response->headers->set('X-Correlation-Id', $id);

        return $response;
    }
}
