/**
 * ALU TRACK formatting — the ONLY place dates and times are formatted.
 *
 * `toLocaleString`, `toLocaleDateString` and `toLocaleTimeString` are banned
 * everywhere else by the `no-raw-date-format` ESLint rule (docs/26 §9). They
 * silently use the browser's timezone, which would quietly misreport "today"
 * for any user whose machine is not set to the yard's timezone — the exact class
 * of defect that is invisible in testing and corrupts every daily KPI.
 *
 * Everything here resolves through the business timezone (CFG-13 / OI-19),
 * read per call so a session that arrives after this module loaded is honoured
 * rather than baked in at import time.
 */
import { TZDate } from '@date-fns/tz'
import { differenceInCalendarDays, differenceInSeconds, format as fnsFormat } from 'date-fns'

import { appTimezone } from './app-config'
import { AGEING_TOKENS, type AgeingKey } from './design-tokens.generated'

export type DateInput = Date | string | number | null | undefined

function toZoned(value: DateInput): TZDate | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new TZDate(date, appTimezone())
}

const EM_DASH = '—'

/** `16 Sep 2026` */
export function formatDate(value: DateInput, fallback = EM_DASH): string {
  const d = toZoned(value)
  return d ? fnsFormat(d, 'dd MMM yyyy') : fallback
}

/** `16 Sep 2026, 10:42` */
export function formatDateTime(value: DateInput, fallback = EM_DASH): string {
  const d = toZoned(value)
  return d ? fnsFormat(d, 'dd MMM yyyy, HH:mm') : fallback
}

/** `10:42` — for same-day contexts such as the PDA result screen. */
export function formatTime(value: DateInput, fallback = EM_DASH): string {
  const d = toZoned(value)
  return d ? fnsFormat(d, 'HH:mm') : fallback
}

/** `16 Sep 2026, 10:42:11.284` — transaction detail and audit precision. */
export function formatPreciseDateTime(value: DateInput, fallback = EM_DASH): string {
  const d = toZoned(value)
  return d ? fnsFormat(d, 'dd MMM yyyy, HH:mm:ss.SSS') : fallback
}

/**
 * The timezone label shown alongside timestamps.
 * Displayed explicitly so a reader never has to guess which clock a report uses.
 */
export function timezoneLabel(): string {
  return appTimezone()
}

/** `2h ago`, `4d ago` — a secondary hint only. Never the sole representation. */
export function formatRelative(value: DateInput, fallback = EM_DASH): string {
  const d = toZoned(value)
  if (!d) return fallback
  const seconds = differenceInSeconds(new TZDate(new Date(), appTimezone()), d)
  if (seconds < 0) return 'just now'
  if (seconds < 45) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`
  const days = Math.floor(seconds / 86_400)
  if (days < 30) return `${days}d ago`
  return formatDate(value, fallback)
}

/**
 * Whole days a pallet has been in inventory, counted in the application timezone.
 *
 * Calendar days, not 24-hour periods: a pallet stored at 23:50 yesterday is
 * "1 day" today, which is how a yard team counts.
 */
export function ageingInDays(from: DateInput, to: DateInput = new Date()): number | null {
  const start = toZoned(from)
  const end = toZoned(to)
  if (!start || !end) return null
  return Math.max(0, differenceInCalendarDays(end, start))
}

/**
 * CFG-04 ageing bucket boundaries (upper bounds, inclusive).
 * Configurable per docs/05 §7; the tokens are fixed so a configuration change
 * never requires a design change.
 */
export const DEFAULT_AGEING_BUCKETS = [7, 15, 30] as const

export function ageingBucket(
  days: number | null,
  buckets: readonly number[] = DEFAULT_AGEING_BUCKETS,
): AgeingKey | null {
  if (days === null) return null
  const [fresh, normal, attention] = buckets
  if (fresh !== undefined && days <= fresh) return 'fresh'
  if (normal !== undefined && days <= normal) return 'normal'
  if (attention !== undefined && days <= attention) return 'attention'
  return 'critical'
}

export function ageingLabel(days: number | null): string {
  if (days === null) return EM_DASH
  if (days === 0) return 'today'
  return `${days}d`
}

export function ageingBucketLabel(key: AgeingKey): string {
  return AGEING_TOKENS[key].label
}

/** `3,847` — grouped, tabular. */
export function formatNumber(value: number | null | undefined, fallback = EM_DASH): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  return new Intl.NumberFormat('en-GB').format(value)
}

/** `76%` */
export function formatPercent(
  value: number | null | undefined,
  digits = 0,
  fallback = EM_DASH,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  return `${value.toFixed(digits)}%`
}

/** `51–100 of 3,847` */
export function formatRange(from: number, to: number, total: number): string {
  return `${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`
}

/** Initials for an avatar, at most two characters. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}
