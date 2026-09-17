import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Generic badge. Pallet statuses must use <StatusBadge>, which resolves through
 * the semantic token map so no screen invents its own status colour (docs/21 §2.4).
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-caption font-medium',
  {
    variants: {
      tone: {
        neutral: 'border-signal-neutral-border bg-signal-neutral-surface text-signal-neutral-fg',
        info: 'border-signal-info-border bg-signal-info-surface text-signal-info-fg',
        success: 'border-signal-success-border bg-signal-success-surface text-signal-success-fg',
        warning: 'border-signal-warning-border bg-signal-warning-surface text-signal-warning-fg',
        danger: 'border-signal-danger-border bg-signal-danger-surface text-signal-danger-fg',
        outline: 'border-graphite-300 bg-graphite-0 text-graphite-600',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export type BadgeProps = VariantProps<typeof badgeVariants> & {
  children: ReactNode
  icon?: ReactNode
  className?: string
}

export function Badge({ tone, icon, children, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {icon}
      {children}
    </span>
  )
}

/** Numeric chip for sidebar counts. Renders nothing at zero. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-signal-warning-surface',
        'px-1.5 py-px text-overline tabular-nums text-signal-warning-fg',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
