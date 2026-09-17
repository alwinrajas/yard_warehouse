import { cn } from '@/lib/cn'

/**
 * ALU TRACK mark.
 *
 * The brand "A": two ascending strokes over a swept arc — the extruded channel
 * section and the path it travels. Drawn as a gradient in the brand blues, with
 * a flat single-colour fallback for dark chrome and for anywhere a gradient
 * would not render (the PDA header, a printed label).
 */
export function LogoMark({
  className,
  flat = false,
}: {
  className?: string
  /** Single-colour rendering, for dark chrome and print. */
  flat?: boolean
}) {
  const id = 'alutrack-mark'

  return (
    <svg viewBox="0 0 32 28" fill="none" aria-hidden className={cn('size-7', className)}>
      {!flat ? (
        <defs>
          <linearGradient id={`${id}-a`} x1="4" y1="26" x2="26" y2="2" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--color-anodic-800)" />
            <stop offset="0.55" stopColor="var(--color-anodic-500)" />
            <stop offset="1" stopColor="var(--color-chart-5)" />
          </linearGradient>
          <linearGradient id={`${id}-b`} x1="8" y1="26" x2="22" y2="8" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--color-graphite-300)" />
            <stop offset="1" stopColor="var(--color-graphite-100)" />
          </linearGradient>
        </defs>
      ) : null}

      {/* The outer stroke of the A. */}
      <path
        d="M12.6 1.6h7.2L31 26.4h-6.6L16.2 7.4 7.9 26.4H1.3L12.6 1.6Z"
        fill={flat ? 'currentColor' : `url(#${id}-a)`}
      />
      {/* The inner sweep — the movement the system records. */}
      <path
        d="M16.2 12.2c4 0 6.9 2.4 8.6 6.6h-5.1c-.9-1.5-2.1-2.3-3.6-2.3-2.2 0-3.9 1.7-5.2 4.6H5.9c2-5.9 5.4-8.9 10.3-8.9Z"
        fill={flat ? 'currentColor' : `url(#${id}-b)`}
        opacity={flat ? 0.45 : 1}
      />
    </svg>
  )
}

/**
 * The lockup. `full` carries the wordmark, `stacked` adds the descriptor used
 * on sign-in, `mark` is the glyph alone for the collapsed rail.
 */
export function Logo({
  variant = 'full',
  className,
  onDark = false,
}: {
  variant?: 'full' | 'mark' | 'stacked'
  className?: string
  onDark?: boolean
}) {
  if (variant === 'mark') {
    return (
      <span className={cn('inline-flex', className)}>
        <LogoMark flat={onDark} className={onDark ? 'text-graphite-0' : undefined} />
        <span className="sr-only">ALU TRACK</span>
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark flat={onDark} className={onDark ? 'text-graphite-0' : undefined} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'text-body tracking-[0.06em]',
            onDark ? 'text-graphite-0' : 'text-graphite-900',
          )}
        >
          <span className="font-bold">ALU</span>
          <span className={cn('font-semibold', onDark ? 'text-anodic-200' : 'text-anodic-600')}>
            TRACK
          </span>
        </span>
        {variant === 'stacked' ? (
          <span
            className={cn(
              'mt-1 text-overline uppercase tracking-[0.18em]',
              onDark ? 'text-graphite-300' : 'text-graphite-500',
            )}
          >
            Track · Manage · Move · Deliver
          </span>
        ) : null}
      </span>
      <span className="sr-only">ALU TRACK — Yard &amp; Warehouse Inventory Tracking</span>
    </span>
  )
}
