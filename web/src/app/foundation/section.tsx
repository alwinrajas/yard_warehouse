import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export function GallerySection({
  id,
  title,
  note,
  children,
  className,
}: {
  id: string
  title: string
  note?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('scroll-mt-20', className)}>
      <div className="mb-4 border-b border-graphite-200 pb-2">
        <h2 className="text-h2 text-graphite-900">{title}</h2>
        {note ? <p className="mt-1 max-w-3xl text-body-sm text-graphite-500">{note}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
}

export function Swatch({
  name,
  varName,
  hint,
}: {
  name: string
  varName: string
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <div
        className="h-12 rounded-lg border border-graphite-200/80"
        style={{ backgroundColor: `var(${varName})` }}
      />
      <p className="mt-1 truncate text-caption text-graphite-700">{name}</p>
      {hint ? <p className="truncate text-caption text-graphite-400">{hint}</p> : null}
    </div>
  )
}
