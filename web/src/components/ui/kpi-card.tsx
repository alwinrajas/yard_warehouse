'use client'

import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'

export type KpiTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

/**
 * KPI tile.
 *
 * Every tile is a link into a pre-filtered working view — no number on the
 * dashboard is a dead end (UX-06). A tile without `href`/`onClick` is a
 * deliberate exception, not the default.
 *
 * Tone colours the icon and the accent only, never the whole card. Eight
 * equally-coloured cards would mean nothing; one amber card among seven
 * neutrals means "look here".
 */
const TONES: Record<KpiTone, { icon: string; accent: string; border: string }> = {
  neutral: {
    icon: 'bg-graphite-100 text-graphite-600',
    accent: 'bg-graphite-300',
    border: 'border-graphite-200',
  },
  primary: {
    icon: 'bg-anodic-50 text-anodic-600',
    accent: 'bg-anodic-500',
    border: 'border-graphite-200',
  },
  success: {
    icon: 'bg-signal-success-surface text-signal-success-fg',
    accent: 'bg-signal-success-fg',
    border: 'border-graphite-200',
  },
  warning: {
    icon: 'bg-signal-warning-surface text-signal-warning-fg',
    accent: 'bg-signal-warning-fg',
    border: 'border-signal-warning-border',
  },
  danger: {
    icon: 'bg-signal-danger-surface text-signal-danger-fg',
    accent: 'bg-signal-danger-fg',
    border: 'border-signal-danger-border',
  },
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  tone = 'neutral',
  icon,
  footer,
  visual,
  onClick,
  className,
}: {
  label: string
  value: number | string
  delta?: number
  deltaLabel?: string
  /** `attention` is kept as an alias for `warning` so existing callers still read correctly. */
  tone?: KpiTone | 'attention'
  icon?: ReactNode
  footer?: ReactNode
  /** A sparkline or meter. Sits below the value; omit it when there is nothing to trend. */
  visual?: ReactNode
  onClick?: () => void
  className?: string
}) {
  const resolved: KpiTone = tone === 'attention' ? 'warning' : tone
  const palette = TONES[resolved]
  const interactive = Boolean(onClick)
  const Wrapper = interactive ? 'button' : 'div'

  return (
    <Wrapper
      {...(interactive ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'group relative flex w-full flex-col items-start overflow-hidden rounded-xl border bg-graphite-0',
        'p-4 text-left shadow-card',
        palette.border,
        interactive && 'card-interactive hover:border-anodic-300',
        interactive &&
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
        className,
      )}
    >
      {/* A 2px accent along the top edge: enough to group and to signal tone,
          not enough to compete with the number. */}
      <span aria-hidden className={cn('absolute inset-x-0 top-0 h-0.5', palette.accent)} />

      <span className="flex w-full items-start justify-between gap-3">
        <span className="text-overline uppercase tracking-wide text-graphite-500">{label}</span>
        {icon ? (
          <span
            aria-hidden
            className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', palette.icon)}
          >
            {icon}
          </span>
        ) : null}
      </span>

      <span className="mt-2.5 flex w-full items-baseline gap-2">
        <span className="text-display leading-none tabular-nums text-graphite-900">
          {typeof value === 'number' ? formatNumber(value) : value}
        </span>
        {delta !== undefined && delta !== 0 ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-caption tabular-nums',
              delta > 0
                ? 'bg-signal-success-surface text-signal-success-fg'
                : 'bg-surface-sunken text-graphite-600',
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
        {interactive ? (
          <ChevronRight
            aria-hidden
            className={cn(
              'ml-auto size-4 shrink-0 self-center text-graphite-300',
              'transition-transform duration-fast ease-standard group-hover:translate-x-0.5',
              'group-hover:text-anodic-500',
            )}
          />
        ) : null}
      </span>

      {visual ? <span className="mt-2 block w-full">{visual}</span> : null}

      {footer ? (
        <span className="mt-1.5 block w-full text-caption text-graphite-500">{footer}</span>
      ) : null}
    </Wrapper>
  )
}
