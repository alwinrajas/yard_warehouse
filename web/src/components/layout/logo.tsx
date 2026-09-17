import { cn } from '@/lib/cn'

/**
 * ALU TRACK mark — an isometric pallet glyph: a square outline with two
 * horizontal slats, echoing an extruded aluminium channel section (docs/21 §8).
 * Single colour, legible at 16px.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('size-6 text-anodic-700', className)}
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2.5 10h19M2.5 14h19" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      <path d="M7 4.5v15M17 4.5v15" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
    </svg>
  )
}

export function Logo({
  variant = 'full',
  className,
  onDark = false,
}: {
  variant?: 'full' | 'mark'
  className?: string
  onDark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={onDark ? 'text-graphite-0' : undefined} />
      {variant === 'full' ? (
        <span
          className={cn(
            'text-body tracking-[0.04em]',
            onDark ? 'text-graphite-0' : 'text-graphite-900',
          )}
        >
          <span className="font-bold">ALU</span>
          <span className="font-normal"> TRACK</span>
        </span>
      ) : null}
      <span className="sr-only">ALU TRACK</span>
    </span>
  )
}
