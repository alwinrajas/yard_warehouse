'use client'

import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'

export type DonutSlice = {
  label: string
  value: number
  /** A token-backed CSS colour, e.g. `var(--color-chart-1)`. */
  color: string
  href?: string
}

/**
 * Donut — proportion of a whole, with the total in the middle.
 *
 * Drawn with stroke-dasharray on a single circle rather than arc paths: fewer
 * moving parts, and the segments animate in by sweeping the dash offset, which
 * reads as the data arriving rather than as decoration.
 */
export function Donut({
  slices,
  total,
  caption,
  size = 168,
  thickness = 18,
  className,
}: {
  slices: DonutSlice[]
  /** Defaults to the sum of the slices; pass it when the centre shows something else. */
  total?: number
  caption?: string
  size?: number
  thickness?: number
  className?: string
}) {
  const sum = slices.reduce((acc, slice) => acc + slice.value, 0)
  const centre = total ?? sum
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  let offset = 0

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-graphite-100"
        />
        {sum > 0
          ? slices.map((slice) => {
              const length = (slice.value / sum) * circumference
              const dash = `${length} ${circumference - length}`
              const element = (
                <circle
                  key={slice.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={thickness}
                  stroke={slice.color}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  className="anim-donut"
                />
              )
              offset += length
              return element
            })
          : null}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-h1 tabular-nums text-graphite-900">{formatNumber(centre)}</span>
        {caption ? <span className="text-caption text-graphite-500">{caption}</span> : null}
      </div>
    </div>
  )
}

/**
 * The legend that belongs beside a donut: indicator, label, value, share.
 * A quiet row hierarchy — no chips, no boxes; the panel border is the frame.
 */
export function DonutLegend({
  slices,
  total,
  className,
  renderLabel,
}: {
  slices: DonutSlice[]
  total?: number
  className?: string
  renderLabel?: (slice: DonutSlice) => React.ReactNode
}) {
  const sum = total ?? slices.reduce((acc, slice) => acc + slice.value, 0)

  return (
    <ul className={cn('flex min-w-0 flex-1 flex-col gap-2.5', className)}>
      {slices.map((slice) => (
        <li key={slice.label} className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: slice.color }}
          />
          <span className="min-w-0 flex-1 truncate text-body-sm text-graphite-700">
            {renderLabel ? renderLabel(slice) : slice.label}
          </span>
          <span className="shrink-0 text-body-sm tabular-nums text-graphite-900">
            {formatNumber(slice.value)}
          </span>
          <span className="w-10 shrink-0 text-right text-caption tabular-nums text-graphite-500">
            {sum > 0 ? `${Math.round((slice.value / sum) * 100)}%` : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}
