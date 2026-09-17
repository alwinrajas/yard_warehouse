import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'

import { cn } from '@/lib/cn'

export type Crumb = { label: string; href?: string }

/** Breadcrumbs reflect the information architecture, not navigation history (N-05). */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1', className)}>
      <ol className="flex items-center gap-1 text-caption text-graphite-500">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {item.href && !last ? (
                  <Link href={item.href} className="rounded-sm hover:text-graphite-800 hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={last ? 'text-graphite-700' : ''}>
                    {item.label}
                  </span>
                )}
              </li>
              {!last ? (
                <li aria-hidden className="text-graphite-300">
                  <ChevronRight className="size-3" />
                </li>
              ) : null}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
