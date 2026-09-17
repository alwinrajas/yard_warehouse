import { KpiSkeleton, Panel, Skeleton } from '@/components/ui'

/**
 * Route-level loading state for the data-heavy screens.
 *
 * Mounted through a per-segment `loading.tsx` rather than one at the `(app)`
 * root, and that placement is load-bearing: a `loading.tsx` makes its whole
 * subtree stream, so the response commits 200 before the page runs. Any route
 * below it that calls `notFound()` can then swap the UI but not the status —
 * which is exactly how `/reports/<unknown>` started answering 200 while
 * rendering a 404 page. Segments that can 404 deliberately have no loading file.
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading page">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </div>
      <Panel className="shadow-card">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-48 w-full" />
      </Panel>
    </div>
  )
}
