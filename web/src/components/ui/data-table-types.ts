import type { ReactNode } from 'react'

import type { SortableDataset } from '@/lib/table/sortable-index-registry'

/** Row density. Persisted per user; switches to `comfortable` on coarse pointers. */
export type TableDensity = 'compact' | 'default' | 'comfortable'

export const DENSITY_HEIGHT: Record<TableDensity, string> = {
  compact: 'var(--layout-row-compact)',
  default: 'var(--layout-row-default)',
  comfortable: 'var(--layout-row-comfortable)',
}

/**
 * Column definition.
 *
 * `priority` drives the responsive behaviour with no per-screen code (docs/20 §7):
 *   1 — always visible
 *   2 — hidden below `md`
 *   3 — hidden below `lg`
 */
export type ColumnPriority = 1 | 2 | 3

export type DataTableColumn<T> = {
  id: string
  header: string
  accessor: (row: T) => ReactNode
  priority: ColumnPriority
  align?: 'left' | 'right'
  width?: string
  /**
   * Sortable columns must have a covering index. The key is validated against
   * lib/table/sortable-index-registry.ts at dev time (docs/26 §9).
   */
  sortable?: boolean
  sortKey?: string
  truncate?: boolean
  /** Value written to XLSX/CSV, so exports match what is on screen. */
  exportValue?: (row: T) => string | number | null
}

export type SortState = { key: string; direction: 'asc' | 'desc' } | null

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  /** Which registry entry governs sortable keys for this table. */
  dataset: SortableDataset
  loading?: boolean
  error?: { code?: string; message: string; traceId?: string } | null
  onRetry?: () => void
  /** Rendered when there are rows to show but none matched the filters. */
  emptyState?: ReactNode
  density?: TableDensity
  sort?: SortState
  onSortChange?: (sort: SortState) => void
  onRowClick?: (row: T) => void
  selectedRowId?: string | null
  rowActions?: (row: T) => ReactNode
  caption?: string
}
