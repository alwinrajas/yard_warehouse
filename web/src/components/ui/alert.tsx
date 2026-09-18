import { cva, type VariantProps } from 'class-variance-authority'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'

import { cn } from '@/lib/cn'

const alertVariants = cva('flex gap-3 rounded-xl border p-3.5 shadow-xs', {
  variants: {
    tone: {
      info: 'border-signal-info-border bg-signal-info-surface text-signal-info-fg',
      success: 'border-signal-success-border bg-signal-success-surface text-signal-success-fg',
      warning: 'border-signal-warning-border bg-signal-warning-surface text-signal-warning-fg',
      danger: 'border-signal-danger-border bg-signal-danger-surface text-signal-danger-fg',
    },
  },
  defaultVariants: { tone: 'info' },
})

const TONE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
}

export type AlertProps = VariantProps<typeof alertVariants> & {
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
  /** Announce to assistive tech — use for alerts that appear in response to an action. */
  live?: boolean
}

export function Alert({ tone = 'info', title, children, action, className, live }: AlertProps) {
  const Icon = TONE_ICON[tone ?? 'info'] ?? Info
  return (
    <div
      className={cn(alertVariants({ tone }), className)}
      role={live ? 'alert' : undefined}
      aria-live={live ? 'assertive' : undefined}
    >
      <span
        aria-hidden
        className="mt-px flex size-6 shrink-0 items-center justify-center rounded-lg bg-current/10"
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-body-sm font-medium">{title}</p> : null}
        {children ? (
          <div className={cn('text-body-sm', title && 'mt-0.5 opacity-90')}>{children}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
