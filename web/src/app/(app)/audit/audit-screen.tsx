'use client'

import { ScrollText } from 'lucide-react'

import { useState } from 'react'

import { AuditDiff } from '@/components/domain/audit-diff'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  Drawer,
  EmptyState,
  FilterBar,
  Input,
  Pagination,
  Panel,
  Select,
  StatPanel,
  type DataTableColumn,
} from '@/components/ui'
import { useApiList } from '@/features/shared/use-api'
import type { AuditRow } from '@/lib/api/inventory-types'
import { formatPreciseDateTime, formatNumber } from '@/lib/format'

const EVENTS = [
  'login', 'user', 'site', 'facility', 'zone', 'location',
  'barcode', 'correction', 'override', 'password',
]

/** W-11 Audit Log (docs/23 §10). Read-only; there is no delete control anywhere. */
export function AuditScreen() {
  const list = useApiList<AuditRow>('audit', '/api/proxy/audit-logs', ['event', 'from', 'to'])
  const [selected, setSelected] = useState<AuditRow | null>(null)

  const columns: DataTableColumn<AuditRow>[] = [
    {
      id: 'when',
      header: 'Timestamp',
      priority: 1,
      accessor: (r) => <span className="font-mono text-mono">{formatPreciseDateTime(r.created_at)}</span>,
    },
    {
      id: 'event',
      header: 'Event',
      priority: 1,
      accessor: (r) => (
        <Badge tone={r.event.startsWith('override') || r.event.startsWith('correction') ? 'warning' : 'outline'}>
          {r.event}
        </Badge>
      ),
    },
    { id: 'entity', header: 'Entity', priority: 2, accessor: (r) => (r.entity_type ? `${r.entity_type} #${r.entity_id}` : '—') },
    { id: 'user', header: 'User', priority: 1, accessor: (r) => r.user_name ?? 'System' },
    { id: 'ip', header: 'IP', priority: 3, accessor: (r) => r.ip_address ?? '—' },
    { id: 'device', header: 'Device', priority: 3, accessor: (r) => r.device_id ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<ScrollText className="size-5" />}
        title="Audit Log"
        context={`${formatNumber(list.pagination.total)} recorded event${list.pagination.total === 1 ? '' : 's'}`}
        breadcrumbs={[{ label: 'Insights' }, { label: 'Audit' }]}
      />

      <Alert tone="info" title="This record is immutable">
        Audit rows have no update or delete path anywhere in ALU TRACK. The table has no
        <span className="font-mono text-mono"> updated_at </span> column, because a row that can be
        modified is not an audit record.
      </Alert>

      <Panel padded={false} className="overflow-hidden shadow-card">
        <div className="flex flex-col gap-3 p-4">
          <DataTableToolbar searchValue={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search…" />
          <FilterBar
            activeFilters={Object.entries(list.filters).map(([id, value]) => ({ id, label: id, value }))}
            onRemoveFilter={(id) => list.setFilter(id, null)}
            onClearAll={list.clearFilters}
          >
            <Select
              ariaLabel="Event"
              placeholder="All events"
              value={list.filters['event'] ?? 'all'}
              onValueChange={(v) => list.setFilter('event', v === 'all' ? null : v)}
              options={[{ value: 'all', label: 'All events' }, ...EVENTS.map((e) => ({ value: e, label: e }))]}
              className="w-44"
            />
            <Input
              type="date"
              aria-label="From date"
              value={list.filters['from'] ?? ''}
              onChange={(e) => list.setFilter('from', e.target.value || null)}
              className="w-40"
            />
            <Input
              type="date"
              aria-label="To date"
              value={list.filters['to'] ?? ''}
              onChange={(e) => list.setFilter('to', e.target.value || null)}
              className="w-40"
            />
          </FilterBar>
        </div>

        <DataTable
          dataset="audit"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message } : null}
          onRetry={() => void list.refetch()}
          onRowClick={setSelected}
          selectedRowId={selected?.id ?? null}
          caption="Audit log"
          emptyState={
            <EmptyState
              variant={list.hasFilters ? 'no-results' : 'no-data'}
              title={list.hasFilters ? 'No audit events match these filters' : 'No audit events yet'}
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
        title={selected?.event ?? ''}
        subtitle={selected ? formatPreciseDateTime(selected.created_at) : undefined}
      >
        {selected ? (
          <div className="flex flex-col gap-5 p-5">
            <StatPanel
              stats={[
                { label: 'Event', value: selected.event, mono: true },
                { label: 'Entity', value: selected.entity_type ? `${selected.entity_type} #${selected.entity_id}` : '—' },
                { label: 'User', value: selected.user_name ?? 'System' },
                { label: 'IP address', value: selected.ip_address ?? '—', mono: true },
                { label: 'Device', value: selected.device_id ?? '—', mono: Boolean(selected.device_id) },
              ]}
            />
            <div>
              <p className="mb-2 text-overline uppercase text-graphite-500">Change</p>
              <AuditDiff before={selected.old_values} after={selected.new_values} />
            </div>
            {selected.context ? (
              <div>
                <p className="mb-1 text-overline uppercase text-graphite-500">Context</p>
                <pre className="overflow-x-auto rounded-md bg-graphite-50 p-3 font-mono text-caption text-graphite-700">
                  {JSON.stringify(selected.context, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
