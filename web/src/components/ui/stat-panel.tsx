import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type Stat = { label: string; value: ReactNode; mono?: boolean }

/** Grouped read-only key/value pairs. Used in drawer bodies and detail headers. */
export function StatPanel({
  stats,
  columns = 2,
  className,
}: {
  stats: Stat[]
  columns?: 1 | 2 | 3
  className?: string
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-3',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-3',
        className,
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          <dt className="text-overline uppercase text-graphite-500">{stat.label}</dt>
          <dd
            className={cn(
              'mt-0.5 truncate text-body-sm text-graphite-800',
              stat.mono && 'font-mono text-mono',
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
