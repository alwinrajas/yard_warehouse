'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'

/**
 * KPI tile.
 *
 * Every tile is a link into a pre-filtered working view — no number on the
 * dashboard is a dead end (UX-06). A tile without `href`/`onClick` is a
 * deliberate exception, not the default.
 */
export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  tone = 'neutral',
  footer,
  onClick,
  className,
}: {
  label: string
  value: number | string
  delta?: number
  deltaLabel?: string
  tone?: 'neutral' | 'attention'
  footer?: ReactNode
  onClick?: () => void
  className?: string
}) {
  const interactive = Boolean(onClick)
  const Wrapper = interactive ? 'button' : 'div'

  return (
    <Wrapper
      {...(interactive ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'flex w-full flex-col items-start rounded-lg border bg-graphite-0 p-4 text-left',
        'transition-colors duration-fast ease-standard',
        tone === 'attention' ? 'border-signal-warning-border' : 'border-graphite-200',
        interactive && 'hover:border-graphite-300 hover:bg-graphite-25',
        interactive &&
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
        className,
      )}
    >
      <span className="text-overline uppercase text-graphite-500">{label}</span>
      <span className="mt-2 flex items-baseline gap-2">
        <span className="text-display tabular-nums text-graphite-900">
          {typeof value === 'number' ? formatNumber(value) : value}
        </span>
        {delta !== undefined && delta !== 0 ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-caption tabular-nums',
              delta > 0 ? 'text-signal-success-fg' : 'text-graphite-500',
            )}
          >
            {delta > 0 ? (
              <ArrowUp className="size-3" aria-hidden />
            ) : (
              <ArrowDown className="size-3" aria-hidden />
            )}
            {formatNumber(Math.abs(delta))}
            {deltaLabel ? <span className="sr-only"> {deltaLabel}</span> : null}
          </span>
        ) : null}
      </span>
      {footer ? <span className="mt-1 text-caption text-graphite-500">{footer}</span> : null}
    </Wrapper>
  )
}
