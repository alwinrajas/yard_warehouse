import { cn } from '@/lib/cn'
import { LOCATION_STATE_TOKENS, type LocationStateKey } from '@/lib/status'

/**
 * LocationRef — the canonical way a location is named (UX-03).
 *
 * A location is a first-class object, not a string: the code is prominent and
 * monospaced, its Facility › Zone context sits quietly beneath, and occupancy is
 * shown as a dot with a non-colour pattern fallback. The most common intent in a
 * WMS is "take me to that location", so it is interactive wherever it appears.
 */
export type LocationSummary = {
  id: string
  code: string
  facilityName?: string | null
  zoneName?: string | null
  state?: LocationStateKey
  palletCount?: number | null
  capacity?: number | null
}

function contextLine(location: LocationSummary): string | null {
  const parts = [location.facilityName, location.zoneName].filter(Boolean)
  return parts.length ? parts.join(' › ') : null
}

export function LocationRef({
  location,
  variant = 'inline',
  showState = true,
  className,
}: {
  location: LocationSummary
  variant?: 'inline' | 'stacked' | 'hero'
  showState?: boolean
  className?: string
}) {
  const token = location.state ? LOCATION_STATE_TOKENS[location.state] : null
  const context = contextLine(location)

  const dot =
    showState && token ? (
      <span
        aria-hidden
        className={cn(
          'size-2 shrink-0 rounded-[2px] border',
          token.className,
          token.pattern === 'hatch' && 'pattern-hatch',
          token.pattern === 'dotted' && 'pattern-dotted',
        )}
      />
    ) : null

  const stateLabel =
    showState && token ? <span className="sr-only">{`, ${token.label}`}</span> : null

  if (variant === 'hero') {
    return (
      <div className={cn('min-w-0', className)}>
        <div className="flex items-center gap-2">
          {dot}
          <span className="inline-flex items-center rounded-md border border-graphite-200/90 bg-graphite-100/80 px-2.5 py-1 font-mono text-mono-lg font-semibold text-graphite-900 shadow-xs">
            {location.code}
          </span>
          {stateLabel}
        </div>
        {context ? <p className="mt-1 text-body-sm text-graphite-500">{context}</p> : null}
        {location.capacity ? (
          <p className="mt-0.5 text-caption tabular-nums text-graphite-500">
            {location.palletCount ?? 0} of {location.capacity} occupied
          </p>
        ) : null}
      </div>
    )
  }

  if (variant === 'stacked') {
    return (
      <div className={cn('min-w-0', className)}>
        <span className="inline-flex items-center gap-1.5">
          {dot}
          <span className="inline-flex items-center rounded-md border border-graphite-200/80 bg-graphite-100/70 px-2 py-0.5 font-mono text-mono font-semibold text-graphite-900 shadow-xs">
            {location.code}
          </span>
          {stateLabel}
        </span>
        {context ? (
          <span className="mt-0.5 block truncate text-caption text-graphite-500">{context}</span>
        ) : null}
      </div>
    )
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      {dot}
      <span className="inline-flex items-center rounded-md border border-graphite-200/80 bg-graphite-100/70 px-2 py-0.5 font-mono text-mono font-semibold text-graphite-900 shadow-xs">
        {location.code}
      </span>
      {stateLabel}
    </span>
  )
}
