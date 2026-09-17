<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserSessionResource;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

/**
 * Authentication (docs/03, docs/09 §3).
 *
 * Failure reasons are distinguished rather than collapsed into one message: an
 * operator needs to know whether to call their supervisor or move closer to an
 * access point (docs/23 §2).
 */
class AuthController extends Controller
{
    private const MAX_ATTEMPTS = 5;

    private const LOCK_MINUTES = 15;

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string'],
            'device_id' => ['nullable', 'string', 'max:100'],
            'device_model' => ['nullable', 'string', 'max:120'],
            'app_version' => ['nullable', 'string', 'max:30'],
            'channel' => ['nullable', 'in:WEB,PDA'],
        ]);

        $channel = $data['channel'] ?? 'WEB';
        $user = User::with(['role', 'site', 'facilities'])
            ->where('username', $data['username'])
            ->first();

        if ($user === null || ! Hash::check($data['password'], $user->password)) {
            if ($user !== null) {
                $this->registerFailure($user);
            }
            AuditLogger::record('login.failed', null, [], [], ['username' => $data['username']]);

            return ApiResponse::error('INVALID_CREDENTIALS', 'Incorrect username or password.', 401);
        }

        if ($user->isLocked()) {
            return ApiResponse::error(
                'ACCOUNT_LOCKED',
                'This account is temporarily locked.',
                423,
                ['locked_for_minutes' => max(1, now()->diffInMinutes($user->locked_until))],
            );
        }

        if (! $user->is_active) {
            AuditLogger::record('login.failed', $user, [], [], ['reason' => 'inactive']);

            return ApiResponse::error('ACCOUNT_INACTIVE', 'This account is inactive.', 403);
        }

        $required = $channel === 'PDA' ? 'auth.login_pda' : 'auth.login_web';
        if (! $user->hasPermission($required)) {
            AuditLogger::record('login.failed', $user, [], [], ['reason' => 'channel_not_permitted', 'channel' => $channel]);

            return ApiResponse::error(
                'NO_WEB_ACCESS',
                $channel === 'PDA'
                    ? 'This account is for the ALU TRACK web console.'
                    : 'This account is for the ALU TRACK PDA application.',
                403,
            );
        }

        // CFG-20: one active PDA session per user makes "no shared credentials"
        // operationally true rather than a policy statement (docs/09 §3).
        if ($channel === 'PDA') {
            $user->tokens()->where('channel', 'PDA')->delete();
        }

        $token = $user->createToken("alutrack-{$channel}", ['*'], now()->addHours(8));
        $token->accessToken->forceFill([
            'device_id' => $data['device_id'] ?? null,
            'device_model' => $data['device_model'] ?? null,
            'app_version' => $data['app_version'] ?? null,
            'channel' => $channel,
            'last_ip' => $request->ip(),
        ])->save();

        $user->forceFill([
            'last_login_at' => now(),
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ])->save();

        AuditLogger::record('login.success', $user, [], [], ['channel' => $channel]);

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
            'user' => (new UserSessionResource($user))->resolve(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->user()->currentAccessToken()->delete();
        AuditLogger::record('logout', $user);

        return ApiResponse::success(['signedOut' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['role', 'site', 'facilities']);

        return ApiResponse::success((new UserSessionResource($user))->resolve());
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return ApiResponse::error('CURRENT_PASSWORD_INVALID', 'That is not your current password.', 422);
        }

        if (Hash::check($data['new_password'], $user->password)) {
            return ApiResponse::error('PASSWORD_POLICY', 'Choose a password you have not used here before.', 422);
        }

        $user->forceFill([
            'password' => $data['new_password'],
            'must_change_password' => false,
            'password_changed_at' => now(),
        ])->save();

        AuditLogger::record('password.changed', $user);

        return ApiResponse::success(['changed' => true]);
    }

    private function registerFailure(User $user): void
    {
        $attempts = $user->failed_login_attempts + 1;
        $user->forceFill([
            'failed_login_attempts' => $attempts,
            'locked_until' => $attempts >= self::MAX_ATTEMPTS ? now()->addMinutes(self::LOCK_MINUTES) : null,
        ])->save();

        if ($attempts >= self::MAX_ATTEMPTS) {
            AuditLogger::record('login.locked', $user);
        }
    }
}
