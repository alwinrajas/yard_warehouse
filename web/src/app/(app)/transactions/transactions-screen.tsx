'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { AuditDiff } from '@/components/domain/audit-diff'
import { TransactionRef } from '@/components/domain/transaction-ref'
import { PageHeader } from '@/components/layout/page-header'
import {
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  Drawer,
  EmptyState,
  FilterBar,
  Pagination,
  Panel,
  Select,
  StatPanel,
  type DataTableColumn,
} from '@/components/ui'
import { useApiList } from '@/features/shared/use-api'
import type { TransactionRow } from '@/lib/api/inventory-types'
import { formatDateTime, formatNumber } from '@/lib/format'

const TYPES = [
  'PUTAWAY', 'TRANSFER', 'DISPATCH', 'STAGE', 'HOLD', 'RELEASE',
  'MARK_DAMAGED', 'FLAG_EXCEPTION', 'CORRECTION', 'OPENING_STOCK',
]

/** W-07 Transaction Monitoring (docs/23 §10). */
export function TransactionsScreen() {
  const router = useRouter()
  const list = useApiList<TransactionRow>('transactions', '/api/proxy/transactions', ['type', 'channel', 'from', 'to'])
  const [selected, setSelected] = useState<TransactionRow | null>(null)

  const columns: DataTableColumn<TransactionRow>[] = [
    {
      id: 'created_at',
      header: 'When',
      priority: 1,
      sortable: true,
      sortKey: 'created_at',
      accessor: (r) => formatDateTime(r.created_at),
    },
    { id: 'ref', header: 'Reference', priority: 1, accessor: (r) => <TransactionRef reference={r.txn_ref} copyable={false} /> },
    { id: 'type', header: 'Action', priority: 1, accessor: (r) => <Badge tone="outline">{r.type}</Badge> },
    {
      id: 'pallet',
      header: 'Pallet',
      priority: 1,
      accessor: (r) => <span className="font-mono text-mono">{r.pallet_number ?? '—'}</span>,
    },
    {
      id: 'move',
      header: 'From → To',
      priority: 2,
      accessor: (r) => (
        <span className="font-mono text-mono text-graphite-700">
          {r.source_location_code ?? '—'} <span className="text-graphite-400">→</span>{' '}
          <span className="text-anodic-700">{r.destination_location_code ?? '—'}</span>
        </span>
      ),
    },
    { id: 'user', header: 'User', priority: 2, accessor: (r) => r.user_name ?? '—' },
    { id: 'channel', header: 'Channel', priority: 3, accessor: (r) => r.channel },
    { id: 'device', header: 'Device', priority: 3, accessor: (r) => r.device_id ?? '—' },
    { id: 'reason', header: 'Reason', priority: 3, truncate: true, accessor: (r) => r.reason ?? r.remarks ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transactions"
        context={`${formatNumber(list.pagination.total)} recorded movement${list.pagination.total === 1 ? '' : 's'} — append-only`}
        breadcrumbs={[{ label: 'Insights' }, { label: 'Transactions' }]}
      />

      <Panel padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search reference, pallet or job…"
          />
          <FilterBar
            activeFilters={Object.entries(list.filters).map(([id, value]) => ({ id, label: id, value }))}
            onRemoveFilter={(id) => list.setFilter(id, null)}
            onClearAll={list.clearFilters}
          >
            <Select
              ariaLabel="Action"
              placeholder="All actions"
              value={list.filters['type'] ?? 'all'}
              onValueChange={(v) => list.setFilter('type', v === 'all' ? null : v)}
              options={[{ value: 'all', label: 'All actions' }, ...TYPES.map((t) => ({ value: t, label: t }))]}
              className="w-48"
            />
            <Select
              ariaLabel="Channel"
              placeholder="All channels"
              value={list.filters['channel'] ?? 'all'}
              onValueChange={(v) => list.setFilter('channel', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: 'All channels' },
                { value: 'PDA', label: 'PDA' },
                { value: 'WEB', label: 'Web' },
                { value: 'SYSTEM', label: 'System' },
              ]}
              className="w-40"
            />
          </FilterBar>
        </div>

        <DataTable
          dataset="transactions"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message } : null}
          onRetry={() => void list.refetch()}
          onRowClick={setSelected}
          selectedRowId={selected?.id ?? null}
          caption="Transaction history"
          emptyState={
            <EmptyState
              variant={list.hasFilters ? 'no-results' : 'no-data'}
              title={list.hasFilters ? 'No transactions match these filters' : 'No transactions recorded yet'}
              description={
                list.hasFilters
                  ? 'Clear the filters to see the full history.'
                  : 'Transactions appear here as soon as the first pallet is put away.'
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

      <Drawer
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.txn_ref ?? 'Transaction'}
        subtitle={selected ? `${selected.type} · ${formatDateTime(selected.created_at)}` : undefined}
        footer={
          selected ? (
            <Button variant="primary" onClick={() => router.push(`/pallets/${selected.pallet_id}`)}>
              View pallet
            </Button>
          ) : null
        }
      >
        {selected ? (
          <div className="flex flex-col gap-5 p-5">
            <StatPanel
              stats={[
                { label: 'Reference', value: selected.txn_ref, mono: true },
                { label: 'Action', value: selected.type },
                { label: 'Pallet', value: selected.pallet_number ?? '—', mono: true },
                { label: 'Job', value: selected.job_number ?? '—', mono: true },
                { label: 'Source', value: selected.source_location_code ?? '—', mono: true },
                { label: 'Destination', value: selected.destination_location_code ?? '—', mono: true },
                { label: 'User', value: selected.user_name ?? '—' },
                { label: 'Channel', value: selected.channel },
                { label: 'Device', value: selected.device_id ?? '—', mono: Boolean(selected.device_id) },
                { label: 'Reason', value: selected.reason ?? '—' },
              ]}
            />

            {selected.remarks ? (
              <div>
                <p className="text-overline uppercase text-graphite-500">Remarks</p>
                <p className="mt-1 text-body-sm text-graphite-700">{selected.remarks}</p>
              </div>
            ) : null}

            {selected.previous_values || selected.new_values ? (
              <div>
                <p className="mb-2 text-overline uppercase text-graphite-500">Before and after</p>
                <AuditDiff before={selected.previous_values} after={selected.new_values} />
              </div>
            ) : null}

            <p className="text-caption text-graphite-500">
              This record is append-only. Corrections create a new linked transaction; the original
              is never modified.
            </p>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
