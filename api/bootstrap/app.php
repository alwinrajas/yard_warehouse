<?php

use App\Http\Middleware\CorrelationId;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsurePermission;
use App\Support\ApiResponse;
use App\Support\BusinessRuleException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [CorrelationId::class]);
        $middleware->alias([
            'permission' => EnsurePermission::class,
            'active' => EnsureActiveUser::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        /*
         * Central exception → envelope mapping (docs/02 §8).
         *
         * Stack traces, SQL and internal identifiers never reach a client. An
         * unexpected failure returns a generic message plus a correlation id,
         * which is all support needs to find the log line.
         */
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (BusinessRuleException $e) {
            return ApiResponse::error($e->errorCode, $e->getMessage(), $e->status, $e->details);
        });

        $exceptions->render(function (ValidationException $e) {
            return ApiResponse::error(
                'VALIDATION_FAILED',
                'Please correct the highlighted fields.',
                422,
                ['fields' => $e->errors()],
            );
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('UNAUTHENTICATED', 'Your session has ended. Sign in again.', 401);
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('NOT_FOUND', 'The requested record was not found.', 404);
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();

                return ApiResponse::error(
                    match ($status) {
                        403 => 'PERMISSION_DENIED',
                        429 => 'RATE_LIMITED',
                        default => 'REQUEST_FAILED',
                    },
                    match ($status) {
                        403 => 'You do not have permission to perform this action.',
                        429 => 'Too many attempts. Wait a moment and try again.',
                        default => 'The request could not be completed.',
                    },
                    $status,
                );
            }

            report($e);

            return ApiResponse::error(
                'INTERNAL_ERROR',
                'Something went wrong. Quote the reference below if you contact support.',
                500,
            );
        });
    })->create();
