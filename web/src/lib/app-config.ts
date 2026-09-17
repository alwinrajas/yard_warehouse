/**
 * Runtime configuration read from the environment.
 *
 * Nothing environment-specific is compiled in (docs/12 §2). Business behaviour
 * lives in `system_settings` on the server and arrives with the session; only
 * values the browser needs before the first API call live here.
 */

/**
 * CFG-13 — application timezone.
 *
 * OPEN ITEM OI-19: the customer has not confirmed the operating timezone.
 * A wrong value silently corrupts every "today" KPI and daily snapshot, and the
 * error is typically noticed a month after go-live — so there is deliberately no
 * plausible-looking default here. We fall back to UTC and say so loudly.
 */
const CONFIGURED_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim()

export const APP_TIMEZONE = CONFIGURED_TIMEZONE && CONFIGURED_TIMEZONE.length > 0
  ? CONFIGURED_TIMEZONE
  : 'UTC'

/** True when NEXT_PUBLIC_APP_TIMEZONE is unset and we are falling back to UTC. */
export const IS_TIMEZONE_UNCONFIRMED = !CONFIGURED_TIMEZONE

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
