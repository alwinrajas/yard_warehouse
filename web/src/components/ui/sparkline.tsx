import { cn } from '@/lib/cn'

/**
 * Sparkline — a trend shape, not a chart.
 *
 * No axes, no labels, no tooltip: it exists to say "rising", "flat" or "falling"
 * at a glance beside a number that already carries the precise value. Anything
 * more belongs on a real chart on a real screen.
 */
export function Sparkline({
  values,
  className,
  tone = 'primary',
  filled = true,
}: {
  values: number[]
  className?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  filled?: boolean
}) {
  if (values.length < 2) return null

  const width = 100
  const height = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    // 2px of padding top and bottom so the stroke is never clipped.
    const y = height - 2 - ((value - min) / span) * (height - 4)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  const stroke = {
    primary: 'stroke-anodic-500',
    success: 'stroke-signal-success-fg',
    warning: 'stroke-signal-warning-fg',
    danger: 'stroke-signal-danger-fg',
    neutral: 'stroke-graphite-400',
  }[tone]

  const stop = {
    primary: 'var(--color-anodic-500)',
    success: 'var(--color-signal-success-fg)',
    warning: 'var(--color-signal-warning-fg)',
    danger: 'var(--color-signal-danger-fg)',
    neutral: 'var(--color-graphite-400)',
  }[tone]
  const gradientId = `spark-${tone}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn('h-7 w-full', className)}
    >
      {filled ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stop} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stop} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,${height} ${points.join(' ')} ${width},${height}`} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <polyline
        points={points.join(' ')}
        fill="none"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={stroke}
      />
    </svg>
  )
}
