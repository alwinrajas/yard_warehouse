'use client'

import { Package } from 'lucide-react'

import { useRouter } from 'next/navigation'

import { AgeingIndicator } from '@/components/domain/ageing-indicator'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { StatusBadge } from '@/components/domain/status-badge'
import { PageHeader } from '@/components/layout/page-header'
import {
  Button,
  DataTable,
  DataTableToolbar,
  EmptyState,
  FilterBar,
  Pagination,
  Panel,
  Select,
  type DataTableColumn,
} from '@/components/ui'
import { useApiList } from '@/features/shared/use-api'
import { statusKeyOf, type PalletDetail } from '@/lib/api/inventory-types'
import { formatDateTime, formatNumber } from '@/lib/format'

/** Pallet register — every pallet the system knows, including dispatched ones. */
export function PalletsScreen() {
  const router = useRouter()
  const list = useApiList<PalletDetail>('pallets', '/api/proxy/pallets', [
    'status', 'job_number', 'include_dispatched',
  ])

  const columns: DataTableColumn<PalletDetail>[] = [
    {
      id: 'pallet',
      header: 'Pallet',
      priority: 1,
      accessor: (r) => (
        <PalletIdentity
          pallet={{
            id: r.id,
            palletNumber: r.pallet_number ?? r.pallet_key,
            jobNumber: r.job_number,
          }}
          variant="stacked"
          showStatus={false}
        />
      ),
    },
    { id: 'customer', header: 'Customer', priority: 2, truncate: true, accessor: (r) => r.customer_name ?? '—' },
    { id: 'lpo', header: 'LPO', priority: 3, accessor: (r) => r.lpo_number ?? '—' },
    { id: 'status', header: 'Status', priority: 1, accessor: (r) => <StatusBadge status={statusKeyOf(r.display_status)} /> },
    {
      id: 'location',
      header: 'Location',
      priority: 1,
      accessor: (r) => (
        <span className="font-mono text-mono text-graphite-900">{r.location?.code ?? '—'}</span>
      ),
    },
    { id: 'putaway', header: 'First put away', priority: 3, accessor: (r) => formatDateTime(r.first_putaway_at) },
    { id: 'ageing', header: 'Age', priority: 2, align: 'right', accessor: (r) => <AgeingIndicator days={r.ageing_days} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Package className="size-5" />}
        title="Pallets"
        context={`${formatNumber(list.pagination.total)} pallet${list.pagination.total === 1 ? '' : 's'} on record`}
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Pallets' }]}
      />

      <Panel padded={false} className="overflow-hidden shadow-card">
        <div className="flex flex-col gap-3 p-4">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search pallet, job, customer or LPO…"
          />
          <FilterBar
            activeFilters={Object.entries(list.filters).map(([id, value]) => ({ id, label: id.replace('_', ' '), value }))}
            onRemoveFilter={(id) => list.setFilter(id, null)}
            onClearAll={list.clearFilters}
          >
            <Select
              ariaLabel="Status"
              placeholder="Active only"
              value={list.filters['include_dispatched'] ?? 'false'}
              onValueChange={(v) => list.setFilter('include_dispatched', v === 'false' ? null : v)}
              options={[
                { value: 'false', label: 'Active only' },
                { value: 'true', label: 'Include dispatched' },
              ]}
              className="w-48"
            />
          </FilterBar>
        </div>

        <DataTable
          dataset="pallets"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message } : null}
          onRetry={() => void list.refetch()}
          onRowClick={(row) => router.push(`/pallets/${row.id}`)}
          caption="Pallet register"
          emptyState={
            <EmptyState
              variant={list.hasFilters ? 'no-results' : 'no-data'}
              title={list.hasFilters ? 'No pallets match these filters' : 'No pallets recorded yet'}
              description="Pallets are created the first time their ERP label is scanned."
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
    </div>
  )
}
