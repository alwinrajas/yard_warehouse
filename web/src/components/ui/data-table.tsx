'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, RotateCw } from 'lucide-react'
import { useMemo } from 'react'

import { cn } from '@/lib/cn'
import { assertSortable } from '@/lib/table/sortable-index-registry'

import { Button } from './button'
import { DENSITY_HEIGHT, type DataTableProps, type DataTableColumn } from './data-table-types'
import { EmptyState } from './empty-state'
import { TableSkeleton } from './skeleton'
import { Tooltip } from './tooltip'

const PRIORITY_CLASS: Record<number, string> = {
  1: '',
  2: 'hidden md:table-cell',
  3: 'hidden lg:table-cell',
}

function skeletonWidths<T>(columns: DataTableColumn<T>[]): string[] {
  return columns.map((column) => (column.priority === 1 ? 'w-28' : 'w-20'))
}

/**
 * DataTable — the single table implementation for every list screen.
 *
 * Sorting, filtering and pagination are always server-driven; this component
 * never sorts or filters client-side, because no screen may fetch an unbounded
 * set (docs/20 §8).
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  dataset,
  loading,
  error,
  onRetry,
  emptyState,
  density = 'default',
  sort,
  onSortChange,
  onRowClick,
  selectedRowId,
  rowActions,
  caption,
  embedded = true,
  className,
}: DataTableProps<T>) {
  // Dev-time guard: a sortable column without a covering index is a defect
  // that only shows up once the yard is full (docs/26 §9).
  useMemo(() => {
    for (const column of columns) {
      if (column.sortable) assertSortable(dataset, column.sortKey ?? column.id)
    }
  }, [columns, dataset])

  if (loading) {
    return (
      <div
        className={cn(
          'overflow-hidden bg-graphite-0',
          embedded ? 'border-t border-graphite-200/80' : 'surface-card rounded-2xl',
          className,
        )}
      >
        <TableSkeleton columns={skeletonWidths(columns)} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'bg-graphite-0',
          embedded ? 'border-t border-graphite-200/80' : 'surface-card rounded-2xl',
          className,
        )}
      >
        <EmptyState
          variant="error"
          title="Could not load this data"
          description={error.message}
          errorCode={error.code}
          traceId={error.traceId}
          action={
            onRetry ? (
              <Button variant="secondary" leftIcon={<RotateCw className="size-4" />} onClick={onRetry}>
                Retry
              </Button>
            ) : null
          }
        />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'bg-graphite-0',
          embedded ? 'border-t border-graphite-200/80' : 'surface-card rounded-2xl',
          className,
        )}
      >
        {emptyState ?? <EmptyState variant="no-results" title="No records found" />}
      </div>
    )
  }

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return
    const key = column.sortKey ?? column.id
    if (sort?.key !== key) onSortChange({ key, direction: 'asc' })
    else if (sort.direction === 'asc') onSortChange({ key, direction: 'desc' })
    else onSortChange(null)
  }

  return (
    <div
      className={cn(
        'overflow-hidden bg-graphite-0',
        embedded ? 'border-t border-graphite-200/80' : 'surface-card rounded-2xl',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-body-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="sticky top-0 z-10 bg-graphite-50/85 backdrop-blur-md">
            <tr className="border-b border-graphite-200">
              {columns.map((column) => {
                const key = column.sortKey ?? column.id
                const active = sort?.key === key
                const ariaSort = active
                  ? sort.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : column.sortable
                    ? 'none'
                    : undefined
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSort}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      'px-4 py-3.5 text-overline uppercase tracking-[0.1em] text-graphite-500 font-semibold',
                      column.align === 'right' ? 'text-right' : 'text-left',
                      PRIORITY_CLASS[column.priority],
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm uppercase font-semibold',
                          'hover:text-graphite-800 transition-colors',
                          active ? 'text-anodic-700 font-bold' : 'text-graphite-500',
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp className="size-3 text-anodic-600" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3 text-anodic-600" aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-35" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
              {rowActions ? <th scope="col" className="w-10 px-2" /> : null}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const id = getRowId(row)
              const selected = selectedRowId === id
              return (
                <tr
                  key={id}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-selected={onRowClick ? selected : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter') onRowClick(row)
                        }
                      : undefined
                  }
                  style={{ height: DENSITY_HEIGHT[density] }}
                  className={cn(
                    'border-b border-graphite-100 transition-colors duration-fast ease-standard',
                    'last:border-0',
                    onRowClick && 'cursor-pointer',
                    selected
                      ? 'bg-anodic-50/70 shadow-[inset_2px_0_0_var(--color-anodic-600)]'
                      : 'hover:bg-anodic-50/45',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-anodic-400',
                  )}
                >
                  {columns.map((column) => {
                    const content = column.accessor(row)
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          'px-4 text-graphite-700',
                          column.align === 'right' && 'text-right',
                          column.truncate && 'max-w-0 truncate',
                          PRIORITY_CLASS[column.priority],
                        )}
                      >
                        {column.truncate && typeof content === 'string' ? (
                          <Tooltip content={content}>
                            <span className="block truncate">{content}</span>
                          </Tooltip>
                        ) : (
                          content
                        )}
                      </td>
                    )
                  })}
                  {rowActions ? (
                    <td className="px-2 text-right" onClick={(event) => event.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
