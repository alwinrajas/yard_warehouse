/**
 * Runtime configuration read from the environment.
 *
 * Nothing environment-specific is compiled in (docs/12 §2). Business behaviour
 * lives in `system_settings` on the server and arrives with the session; only
 * values the browser needs before the first API call live here.
 */

/**
 * CFG-13 — the business timezone.
 *
 * The authority is `system_settings` on the server, which is where the backend
 * computes every "today" boundary from. It reaches the browser on the session,
 * so the two can never disagree: one value, one place, both ends.
 *
 * The environment variable remains only as a pre-session fallback — the login
 * screen renders before any session exists. If neither is set we use UTC and say
 * so loudly in the header rather than picking a plausible-looking zone, because
 * a wrong timezone silently corrupts every daily KPI and is typically noticed a
 * month after go-live (OI-19).
 */
const ENV_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim()

const FALLBACK_TIMEZONE = 'UTC'

let resolvedTimezone: string | null = null

/**
 * Adopt the timezone the server reports for this session.
 *
 * Called once as the session is established. Module-level rather than context
 * because `format.ts` is a plain module used outside React too, and a formatter
 * that needed a provider would be trivially bypassed.
 */
export function setAppTimezone(timezone: string | null | undefined): void {
  resolvedTimezone = timezone?.trim() || null
}

export function appTimezone(): string {
  return resolvedTimezone ?? (ENV_TIMEZONE && ENV_TIMEZONE.length > 0 ? ENV_TIMEZONE : FALLBACK_TIMEZONE)
}

/** True while nothing has confirmed a zone and we are falling back to UTC. */
export function isTimezoneUnconfirmed(): boolean {
  return !resolvedTimezone && !ENV_TIMEZONE
}

export const APP_NAME = 'ALU TRACK'
export const APP_FULL_NAME =
  'ALU TRACK — Yard & Warehouse Inventory Tracking & Traceability System'
export const APP_TAGLINE = 'Track Every Pallet. Know Every Location.'

export const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? 'development'
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0'

/** CFG-14 — live-update poll interval for dashboard and inventory watermarks. */
export const POLL_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_SECONDS ?? 15) * 1000

/** CFG-18 — default table page size. */
export const DEFAULT_PAGE_SIZE = Number(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE ?? 50)

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const
