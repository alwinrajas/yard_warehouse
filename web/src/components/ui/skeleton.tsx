import { cn } from '@/lib/cn'

/**
 * Skeletons match the final geometry exactly — right column widths, right row
 * count — so nothing shifts when data arrives (docs/25 §3).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-sm bg-graphite-100', className)}
    />
  )
}

export function TextSkeleton({ width = 'w-24' }: { width?: string }) {
  return <Skeleton className={cn('h-3.5', width)} />
}

export function TableSkeleton({
  rows = 8,
  columns,
}: {
  rows?: number
  /** Width class per column, so the skeleton matches the real table. */
  columns: string[]
}) {
  return (
    <div role="status" aria-label="Loading table" className="w-full">
      <div className="flex items-center gap-4 border-b border-graphite-200 bg-graphite-50 px-4 py-2.5">
        {columns.map((width, index) => (
          <Skeleton key={index} className={cn('h-3', width)} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-graphite-200 px-4"
          style={{ height: 'var(--layout-row-default)' }}
        >
          {columns.map((width, index) => (
            <Skeleton key={index} className={cn('h-3.5', width)} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function KpiSkeleton() {
  return (
    <div className="rounded-lg border border-graphite-200 bg-graphite-0 p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-16" />
    </div>
  )
}
