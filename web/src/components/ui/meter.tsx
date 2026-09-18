import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'

/**
 * Meter — one labelled horizontal bar.
 *
 * The bar is decorative; the number beside it carries the value, so the bar may
 * be scaled against the largest row without misleading anyone.
 */
export function Meter({
  label,
  value,
  max,
  color = 'var(--color-chart-1)',
  suffix,
  className,
}: {
  label: React.ReactNode
  value: number
  max: number
  color?: string
  suffix?: React.ReactNode
  className?: string
}) {
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="w-28 shrink-0 truncate text-body-sm text-graphite-700 sm:w-32">{label}</span>
      <span
        aria-hidden
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-graphite-100 inset-shadow-[0_1px_1px_0_rgba(17,22,31,0.05)]"
      >
        <span
          className="anim-meter block h-full rounded-full"
          style={{ width: `${share * 100}%`, backgroundColor: color }}
        />
      </span>
      <span className="w-12 shrink-0 text-right text-body-sm tabular-nums text-graphite-900">
        {formatNumber(value)}
      </span>
      {suffix ? <span className="w-10 shrink-0 text-right text-caption tabular-nums text-graphite-500">{suffix}</span> : null}
    </div>
  )
}
