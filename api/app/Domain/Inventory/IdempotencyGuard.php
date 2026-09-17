<?php

namespace App\Domain\Inventory;

use App\Support\BusinessRuleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Replay protection (BR-08, docs/02 §6.4).
 *
 * A replay returns the ORIGINAL response, not an error. That is the difference
 * between duplicate protection and breaking a legitimate retry after a dropped
 * connection: an operator whose network died mid-confirm retries and gets the
 * real success.
 *
 * The same key with a different payload is a client bug and is refused, so one
 * request can never return another's result.
 */
class IdempotencyGuard
{
    public function find(string $key, string $endpoint, array $payload): ?JsonResponse
    {
        $record = DB::table('idempotency_keys')
            ->where('key', $key)
            ->where('user_id', Auth::id())
            ->first();

        if ($record === null) {
            return null;
        }

        if ($record->request_hash !== $this->hash($payload)) {
            throw new BusinessRuleException(
                'IDEMPOTENCY_KEY_REUSED',
                'This request reference has already been used with different details.',
                422,
            );
        }

        return response()->json(json_decode($record->response_body, true), $record->response_status)
            ->header('Idempotency-Replayed', 'true');
    }

    public function remember(string $key, string $endpoint, array $payload, JsonResponse $response): void
    {
        DB::table('idempotency_keys')->insert([
            'key' => $key,
            'user_id' => Auth::id(),
            'endpoint' => $endpoint,
            'request_hash' => $this->hash($payload),
            'response_status' => $response->getStatusCode(),
            'response_body' => $response->getContent(),
            'created_at' => now(),
            'expires_at' => now()->addHours((int) config('alutrack.idempotency_ttl_hours', 24)),
        ]);
    }

    private function hash(array $payload): string
    {
        ksort($payload);

        return hash('sha256', json_encode($payload) ?: '');
    }
}
