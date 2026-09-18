import { ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Wrapper for corrections, reversals and overrides (UX-08).
 *
 * If correcting inventory looks like editing a row, it will be treated like
 * editing a row. This makes the difference visible before anything is typed.
 */
export function PrivilegedAction({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-lg border-2 border-signal-warning-border bg-signal-warning-surface p-5',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-signal-warning-fg" aria-hidden />
        <div className="min-w-0">
          <p className="text-overline uppercase text-signal-warning-fg">Administrative action</p>
          <h3 className="mt-0.5 text-h3 text-graphite-900">{title}</h3>
          {description ? (
            <p className="mt-1 text-body-sm text-graphite-700">{description}</p>
          ) : null}
        </div>
      </header>

      <div className="surface-card mt-4 rounded-xl p-4 sm:p-5">{children}</div>
    </section>
  )
}
