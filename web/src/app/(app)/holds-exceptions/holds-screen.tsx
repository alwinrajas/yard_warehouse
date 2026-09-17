'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { PermissionGate } from '@/components/domain/permission-gate'
import { StatusBadge } from '@/components/domain/status-badge'
import { PageHeader } from '@/components/layout/page-header'
import {
  Button,
  DataTable,
  DataTableToolbar,
  EmptyState,
  FilterBar,
  Field,
  Modal,
  Pagination,
  Panel,
  Select,
  Textarea,
  type DataTableColumn,
} from '@/components/ui'
import { useApiList, useApiMutation } from '@/features/shared/use-api'
import { statusKeyOf, type HoldRow } from '@/lib/api/inventory-types'
import { cn } from '@/lib/cn'
import { formatDateTime, formatNumber } from '@/lib/format'

/** W-17 Holds & Exceptions (docs/23 §10). */
export function HoldsScreen() {
  const router = useRouter()
  const list = useApiList<HoldRow>('holds', '/api/proxy/holds', ['state', 'hold_type'], { state: 'open' })
  const [releasing, setReleasing] = useState<HoldRow | null>(null)
  const [remarks, setRemarks] = useState('')

  const release = useApiMutation<{ id: string; remarks: string | null }, unknown>(
    ({ id, remarks: note }) => ({ path: `/api/proxy/holds/${id}/release`, body: { remarks: note } }),
    ['holds', 'inventory', 'dashboard', 'pallet'],
  )

  const columns: DataTableColumn<HoldRow>[] = [
    {
      id: 'pallet',
      header: 'Pallet',
      priority: 1,
      accessor: (r) => (
        <div className="min-w-0">
          <span className="block font-mono text-mono text-graphite-900">{r.pallet_number ?? '—'}</span>
          {r.job_number ? <span className="block text-caption text-graphite-500">{r.job_number}</span> : null}
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      priority: 1,
      accessor: (r) => <StatusBadge status={statusKeyOf(r.hold_type === 'HOLD' ? 'ON_HOLD' : r.hold_type)} />,
    },
    { id: 'reason', header: 'Reason', priority: 1, truncate: true, accessor: (r) => r.reason ?? '—' },
    { id: 'remarks', header: 'Remarks', priority: 3, truncate: true, accessor: (r) => r.remarks ?? '—' },
    { id: 'by', header: 'Placed by', priority: 2, accessor: (r) => r.placed_by ?? '—' },
    { id: 'at', header: 'Placed at', priority: 2, accessor: (r) => formatDateTime(r.placed_at) },
    {
      id: 'days',
      header: 'Days held',
      priority: 1,
      align: 'right',
      accessor: (r) => (
        <span
          className={cn(
            'tabular-nums',
            (r.days_held ?? 0) > 30 ? 'text-ageing-critical' : (r.days_held ?? 0) > 15 ? 'text-ageing-attention' : 'text-graphite-600',
          )}
        >
          {r.days_held ?? 0}
        </span>
      ),
    },
    {
      id: 'state',
      header: 'State',
      priority: 2,
      accessor: (r) => (r.is_open ? 'Open' : `Released ${formatDateTime(r.released_at)}`),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Holds & Exceptions"
        context={`${formatNumber(list.pagination.total)} record${list.pagination.total === 1 ? '' : 's'} — pallets blocked from normal dispatch`}
        breadcrumbs={[{ label: 'Operations' }, { label: 'Holds & Exceptions' }]}
      />

      <Panel padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search pallet or job…"
          />
          <FilterBar
            activeFilters={Object.entries(list.filters)
              .filter(([, v]) => v)
              .map(([id, value]) => ({ id, label: id.replace('_', ' '), value }))}
            onRemoveFilter={(id) => list.setFilter(id, null)}
            onClearAll={list.clearFilters}
          >
            <Select
              ariaLabel="State"
              value={list.filters['state'] ?? 'open'}
              onValueChange={(v) => list.setFilter('state', v)}
              options={[
                { value: 'open', label: 'Open holds' },
                { value: 'released', label: 'Released' },
                { value: 'all', label: 'All' },
              ]}
              className="w-44"
            />
            <Select
              ariaLabel="Type"
              placeholder="All types"
              value={list.filters['hold_type'] ?? 'all'}
              onValueChange={(v) => list.setFilter('hold_type', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'HOLD', label: 'Hold' },
                { value: 'DAMAGED', label: 'Damaged' },
                { value: 'EXCEPTION', label: 'Exception' },
              ]}
              className="w-40"
            />
          </FilterBar>
        </div>

        <DataTable
          dataset="holds"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message } : null}
          onRetry={() => void list.refetch()}
          onRowClick={(row) => router.push(`/pallets/${row.pallet_id}`)}
          caption="Holds and exceptions"
          rowActions={(row) =>
            row.is_open ? (
              <PermissionGate permission="hold.release">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setRemarks('')
                    setReleasing(row)
                  }}
                >
                  Release
                </Button>
              </PermissionGate>
            ) : null
          }
          emptyState={
            <EmptyState
              variant={list.hasFilters ? 'no-results' : 'no-data'}
              title={list.hasFilters ? 'No holds match these filters' : 'No pallets are on hold'}
              description={
                list.hasFilters
                  ? 'Clear the filters to see every hold.'
                  : 'Nothing is currently blocked from dispatch. That is a good answer.'
              }
              action={
                list.hasFilters ? (
                  <Button variant="primary" onClick={list.clearFilters}>
                    Clear all filters
                  </Button>
                ) : undefined
              }
            />
          }
        />

        {list.pagination.total > 0 ? (
          <Pagination
            page={list.pagination.page}
            pageSize={list.pagination.pageSize}
            total={list.pagination.total}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        ) : null}
      </Panel>

      <Modal
        open={releasing !== null}
        onOpenChange={(open) => !open && setReleasing(null)}
        title={`Release the hold on ${releasing?.pallet_number ?? ''}?`}
        description="The pallet becomes eligible for dispatch immediately. The hold and its release both stay in the audit trail."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReleasing(null)} disabled={release.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={release.isPending}
              loadingLabel="Releasing…"
              onClick={() =>
                releasing &&
                release.mutate(
                  { id: releasing.id, remarks: remarks.trim() || null },
                  { onSettled: () => setReleasing(null) },
                )
              }
            >
              Release hold
            </Button>
          </>
        }
      >
        <Field label="Remarks" description="Why is this hold being released?">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} showCount />
        </Field>
      </Modal>
    </div>
  )
}
