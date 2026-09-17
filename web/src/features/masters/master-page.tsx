'use client'

import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import {
  DataTable,
  DataTableToolbar,
  FilterBar,
  Pagination,
  Panel,
  type ActiveFilter,
  type DataTableColumn,
  type SortState,
} from '@/components/ui'
import type { ApiError } from '@/lib/api/errors'
import { formatNumber } from '@/lib/format'
import type { SortableDataset } from '@/lib/table/sortable-index-registry'

/**
 * Shared shell for the four master screens.
 *
 * They differ in columns, filters and form fields — not in structure — so the
 * structure lives here once. Anything screen-specific is passed in rather than
 * configured, which keeps the abstraction shallow enough to read.
 */
export function MasterPage<T>({
  title,
  context,
  breadcrumbs,
  primaryAction,
  dataset,
  columns,
  rows,
  getRowId,
  loading,
  error,
  onRetry,
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  activeFilters,
  onRemoveFilter,
  onClearFilters,
  sort,
  onSortChange,
  onRowClick,
  selectedRowId,
  rowActions,
  emptyState,
  pagination,
  onPageChange,
  onPageSizeChange,
  children,
}: {
  title: string
  context?: ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  primaryAction?: ReactNode
  dataset: SortableDataset
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  loading?: boolean
  error?: ApiError | null
  onRetry?: () => void
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: ReactNode
  activeFilters?: ActiveFilter[]
  onRemoveFilter?: (id: string) => void
  onClearFilters?: () => void
  sort?: SortState
  onSortChange?: (sort: SortState) => void
  onRowClick?: (row: T) => void
  selectedRowId?: string | null
  rowActions?: (row: T) => ReactNode
  emptyState?: ReactNode
  pagination: { page: number; pageSize: number; total: number }
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        context={context ?? `${formatNumber(pagination.total)} records`}
        breadcrumbs={breadcrumbs}
        actions={primaryAction}
      />

      <Panel padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
          />
          {filters ? (
            <FilterBar
              activeFilters={activeFilters}
              onRemoveFilter={onRemoveFilter}
              onClearAll={onClearFilters}
            >
              {filters}
            </FilterBar>
          ) : null}
        </div>

        <DataTable
          dataset={dataset}
          columns={columns}
          rows={rows}
          getRowId={getRowId}
          loading={loading}
          error={
            error ? { code: error.code, message: error.message, traceId: error.traceId } : null
          }
          onRetry={onRetry}
          sort={sort ?? null}
          onSortChange={onSortChange}
          onRowClick={onRowClick}
          selectedRowId={selectedRowId}
          rowActions={rowActions}
          emptyState={emptyState}
          caption={title}
        />

        {pagination.total > 0 ? (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        ) : null}
      </Panel>

      {children}
    </div>
  )
}
