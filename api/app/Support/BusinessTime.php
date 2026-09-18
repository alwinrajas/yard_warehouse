<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use DateTimeZone;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * The business calendar (CFG-13 / OI-19).
 *
 * Two clocks exist in this system and conflating them is the defect CFG-13 was
 * written to prevent:
 *
 *  - STORAGE is UTC and stays UTC. `config('app.timezone')` is never changed,
 *    so every row written before and after this class existed means the same
 *    instant. Changing the application timezone instead would have shifted new
 *    writes while leaving history behind, silently corrupting the ledger.
 *
 *  - The BUSINESS DAY is whatever CFG-13 says. "Today" at a yard in Dubai ends
 *    at 20:00 UTC, not at midnight UTC, and a dispatch recorded at 21:30 local
 *    belongs to that local day. Every "today" figure and every date-range filter
 *    resolves through here.
 *
 * Nothing here converts stored data. It converts *boundaries* — the instants a
 * business day starts and ends — and hands them to the query as UTC.
 */
final class BusinessTime
{
    private static ?bool $namedZonesSupported = null;

    /**
     * The configured business timezone.
     *
     * Falls back to the documented CFG-13 default rather than guessing a
     * customer's zone. A configured value that is not a valid IANA identifier is
     * ignored rather than trusted — an unparseable zone would otherwise throw
     * deep inside an unrelated query.
     */
    public static function zone(): string
    {
        $configured = Settings::get('app.timezone');

        if (is_string($configured) && self::isValidZone($configured)) {
            return $configured;
        }

        return 'UTC';
    }

    public static function isValidZone(string $zone): bool
    {
        if ($zone === '') {
            return false;
        }

        // Abbreviations such as IST are ambiguous (India and Israel and Ireland)
        // and carry no DST rules, so only full IANA identifiers are accepted.
        return in_array($zone, DateTimeZone::listIdentifiers(), true);
    }

    /** Now, expressed in the business zone. */
    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::zone());
    }

    /**
     * The instant the current business day began, as UTC.
     *
     * This is what a `created_at >= ?` comparison needs: the column is UTC, so
     * the boundary must be too.
     */
    public static function startOfToday(): CarbonImmutable
    {
        return self::now()->startOfDay()->utc();
    }

    /** The instant a given business date began (`Y-m-d`), as UTC. */
    public static function startOfDay(string $date): CarbonImmutable
    {
        return CarbonImmutable::parse($date, self::zone())->startOfDay()->utc();
    }

    /**
     * The instant a given business date ended, as UTC.
     *
     * Returned as the start of the next day so callers compare with `<`, which
     * cannot drop a transaction recorded in the final second of the day the way
     * a `<= 23:59:59` bound does.
     */
    public static function endOfDay(string $date): CarbonImmutable
    {
        return CarbonImmutable::parse($date, self::zone())->startOfDay()->addDay()->utc();
    }

    /**
     * Whole days a pallet has been standing, counted in business days.
     *
     * Ageing drives the buckets, the dashboard threshold and the MIS, so the
     * count has to advance when the yard's day turns over — not when UTC's does.
     * Counting calendar days apart in the business zone means a pallet put away
     * at 23:00 local is one day old the next morning, which is what the yard
     * would say.
     */
    public static function daysStanding(mixed $from, mixed $to = null): ?int
    {
        if ($from === null) {
            return null;
        }

        $zone = self::zone();
        $start = CarbonImmutable::parse($from)->setTimezone($zone)->startOfDay();
        $end = ($to === null ? self::now() : CarbonImmutable::parse($to)->setTimezone($zone))
            ->startOfDay();

        return (int) $start->diffInDays($end);
    }

    /**
     * SQL that yields the business date of a stored UTC column.
     *
     * Needed only where a report groups *by day* and so cannot be expressed as a
     * pair of boundaries — the daily movement summary.
     *
     * Prefers CONVERT_TZ with the named zone, which is exact across daylight
     * saving. That requires the server's timezone tables to be populated
     * (`mysql_tzinfo_to_sql`), which many deployments skip, so it degrades to a
     * fixed offset. The fallback is exact for zones without daylight saving —
     * which includes every plausible zone for this customer — and can be out by
     * an hour either side of a transition elsewhere.
     */
    public static function dateExpression(string $column): string
    {
        $zone = self::zone();

        if ($zone === 'UTC') {
            return "DATE({$column})";
        }

        if (self::namedZonesSupported()) {
            return "DATE(CONVERT_TZ({$column}, '+00:00', ".DB::getPdo()->quote($zone).'))';
        }

        $offset = self::now()->getOffset();

        return "DATE({$column} + INTERVAL {$offset} SECOND)";
    }

    /** Whether the database can resolve named IANA zones (tz tables loaded). */
    public static function namedZonesSupported(): bool
    {
        if (self::$namedZonesSupported !== null) {
            return self::$namedZonesSupported;
        }

        try {
            $result = DB::selectOne(
                "SELECT CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'Asia/Kolkata') AS converted",
            );

            self::$namedZonesSupported = $result !== null && $result->converted !== null;
        } catch (Throwable) {
            self::$namedZonesSupported = false;
        }

        return self::$namedZonesSupported;
    }

    /** Test seam: clears the memoised database capability probe. */
    public static function forget(): void
    {
        self::$namedZonesSupported = null;
    }
}
