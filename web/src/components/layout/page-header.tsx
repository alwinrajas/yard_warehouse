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
  className,
}: {
  title: string
  context?: ReactNode
  breadcrumbs?: Crumb[]
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h1 text-graphite-900">{title}</h1>
          {context ? <p className="mt-1 text-body-sm text-graphite-500">{context}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
