import { ArrowDown, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { LocationRef, type LocationSummary } from './location-ref'

/**
 * MovementDirection — source → destination, never two labelled fields (UX-04).
 *
 * A direction is understood pre-attentively; two labelled fields have to be read.
 * That difference matters most to an operator glancing at a screen in a forklift.
 * Source renders in graphite, destination in anodic, so which end is which is
 * legible without reading either label.
 */
export function MovementDirection({
  from,
  to,
  orientation = 'horizontal',
  middle,
  fromLabel = 'From',
  toLabel = 'To',
  className,
}: {
  from?: LocationSummary | null
  to?: LocationSummary | null
  orientation?: 'horizontal' | 'vertical'
  middle?: ReactNode
  fromLabel?: string
  toLabel?: string
  className?: string
}) {
  const vertical = orientation === 'vertical'
  const Arrow = vertical ? ArrowDown : ArrowRight

  const endpoint = (
    location: LocationSummary | null | undefined,
    label: string,
    emphasis: boolean,
  ) => (
    <div className="min-w-0 flex-1">
      <span className="block text-overline uppercase text-graphite-500">{label}</span>
      {location ? (
        <span
          className={cn(
            'mt-0.5 block font-mono',
            vertical ? 'text-mono-lg' : 'text-mono',
            emphasis ? 'text-anodic-700' : 'text-graphite-800',
          )}
        >
          <LocationRef location={location} variant="stacked" />
        </span>
      ) : (
        <span className="mt-0.5 block text-body-sm text-graphite-400">—</span>
      )}
    </div>
  )

  return (
    <div
      className={cn(
        'flex gap-3',
        vertical ? 'flex-col items-stretch' : 'flex-row items-center',
        className,
      )}
    >
      {endpoint(from, fromLabel, false)}
      <div className={cn('flex shrink-0 flex-col items-center gap-1', vertical && 'py-1')}>
        <Arrow className="size-5 text-graphite-400" aria-hidden />
        <span className="sr-only">moved to</span>
        {middle}
      </div>
      {endpoint(to, toLabel, true)}
    </div>
  )
}
