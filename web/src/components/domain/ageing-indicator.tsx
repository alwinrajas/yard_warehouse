import { cn } from '@/lib/cn'
import { ageingBucket, ageingLabel, DEFAULT_AGEING_BUCKETS } from '@/lib/format'
import { AGEING_TOKENS } from '@/lib/status'

import { Tooltip } from '../ui/tooltip'

/**
 * AgeingIndicator.
 *
 * Ageing counts from first entry into inventory, never from the last transfer —
 * the customer's question is "how long has this been sitting here", which an
 * internal relocation does not reset (docs/05 §6).
 */
export function AgeingIndicator({
  days,
  putAwayDate,
  buckets = DEFAULT_AGEING_BUCKETS,
  showBar = true,
  className,
}: {
  days: number | null
  putAwayDate?: string
  buckets?: readonly number[]
  showBar?: boolean
  className?: string
}) {
  const bucket = ageingBucket(days, buckets)
  const token = bucket ? AGEING_TOKENS[bucket] : null
  const max = buckets[buckets.length - 1] ?? 30
  const fill = days === null ? 0 : Math.min(100, (days / max) * 100)

  const body = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('tabular-nums', token?.className ?? 'text-graphite-500')}>
        {ageingLabel(days)}
      </span>
      {showBar && days !== null ? (
        <span aria-hidden className="h-1 w-10 overflow-hidden rounded-full bg-graphite-100">
          <span
            className={cn('block h-full rounded-full', token ? token.className : '')}
            style={{ width: `${fill}%`, backgroundColor: 'currentColor' }}
          />
        </span>
      ) : null}
      {token ? <span className="sr-only">{`, ${token.label}`}</span> : null}
    </span>
  )

  if (!putAwayDate) return body
  return <Tooltip content={`Put away ${putAwayDate}`}>{body}</Tooltip>
}
