import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * The default content surface.
 *
 * Every raised surface in the product is this same material — a 1px cool
 * hairline, a white body and a layered, low-alpha shadow — so the console reads
 * as one crafted instrument rather than a set of ad-hoc boxes (docs/21 §4).
 * Shadow still only says "this is a layer"; it never encodes importance.
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
        'surface-card relative rounded-lg',
        padded && 'p-5',
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
    <header className={cn('mb-5 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-h3 text-graphite-900">{title}</h3>
        {description ? <p className="mt-1 text-caption text-graphite-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/**
 * A section label inside a panel. Uppercase, letterspaced and quiet — it
 * separates groups without drawing a rule through the surface.
 */
export function SectionHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h4 className={cn('text-overline uppercase text-graphite-500', className)}>{children}</h4>
  )
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-graphite-200/80', className)} />
}
