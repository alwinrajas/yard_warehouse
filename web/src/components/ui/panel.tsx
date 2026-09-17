import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * The default content surface: elevation e0 — a 1px border and no shadow.
 * Shadow indicates layering, never importance (docs/21 §4).
 */
export function Panel({
  children,
  className,
  padded = true,
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  padded?: boolean
  as?: 'section' | 'div' | 'article'
}) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-graphite-200/80 bg-graphite-0 shadow-card transition-shadow duration-fast',
        padded && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-h3 text-graphite-800">{title}</h3>
        {description ? <p className="mt-0.5 text-caption text-graphite-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function SectionHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <h4 className={cn('text-overline uppercase text-graphite-500', className)}>{children}</h4>
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-graphite-200', className)} />
}
