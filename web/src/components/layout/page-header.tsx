import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Breadcrumbs, type Crumb } from './breadcrumbs'

/**
 * PageHeader.
 *
 * The one-line context beneath every title ("3,847 pallets across 2 facilities")
 * is deliberate: it tells the user what they are looking at *and* confirms the
 * scope in force, in the place they are already looking (docs/22 §3.3).
 */
export function PageHeader({
  title,
  context,
  breadcrumbs,
  actions,
  icon,
  meta,
  className,
}: {
  title: string
  context?: ReactNode
  breadcrumbs?: Crumb[]
  actions?: ReactNode
  /** A tinted glyph for operational screens. Masters and reports go without. */
  icon?: ReactNode
  /** Sits under the title beside the context — "last updated", counts, scope. */
  meta?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <span
              aria-hidden
              className={cn(
                'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg',
                'border border-anodic-200 bg-anodic-50 text-anodic-600',
              )}
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-h1 tracking-[-0.02em] text-graphite-900">{title}</h1>
            {context || meta ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {context ? <p className="text-body-sm text-graphite-500">{context}</p> : null}
                {context && meta ? (
                  <span className="size-1 rounded-full bg-graphite-300" aria-hidden />
                ) : null}
                {meta}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
