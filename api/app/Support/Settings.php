<?php

namespace App\Support;

use App\Models\SystemSetting;

/**
 * Read access to the configuration register (docs/05 §7).
 *
 * Resolved once per request rather than per call — settings are read on nearly
 * every transaction path, and a per-call query would put a SELECT in front of
 * each business rule. Writes clear the memo, so a change takes effect on the
 * next request without a deploy.
 */
final class Settings
{
    /** @var array<string, mixed>|null */
    private static ?array $memo = null;

    public static function get(string $key, mixed $fallback = null): mixed
    {
        self::$memo ??= SystemSetting::all()
            ->mapWithKeys(fn (SystemSetting $s) => [$s->key => $s->typedValue()])
            ->all();

        return self::$memo[$key] ?? $fallback;
    }

    public static function bool(string $key, bool $fallback = false): bool
    {
        return (bool) self::get($key, $fallback);
    }

    public static function int(string $key, int $fallback = 0): int
    {
        return (int) self::get($key, $fallback);
    }

    public static function forget(): void
    {
        self::$memo = null;
    }
}
