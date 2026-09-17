'use client'

import { Boxes, MoreHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { AgeingIndicator } from '@/components/domain/ageing-indicator'
import { LocationRef } from '@/components/domain/location-ref'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { StatusBadge } from '@/components/domain/status-badge'
import { PageHeader } from '@/components/layout/page-header'
import {
  Button,
  DataTable,
  DataTableToolbar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  FilterBar,
  IconButton,
  Pagination,
  Panel,
  Select,
  type DataTableColumn,
} from '@/components/ui'
import { useFacilityLookup, useZoneLookup } from '@/features/masters/use-lookups'
import { useApiList } from '@/features/shared/use-api'
import { statusKeyOf, type InventoryRow } from '@/lib/api/inventory-types'
import { formatDateTime, formatNumber } from '@/lib/format'
import { usePermission } from '@/lib/permissions/session'

/** W-02 Live Inventory (docs/23 §4). */
export function InventoryScreen() {
  const router = useRouter()
  const can = usePermission()
  const list = useApiList<InventoryRow>('inventory', '/api/proxy/inventory', [
    'facility_id', 'zone_id', 'status', 'ageing', 'job_number', 'lpo',
  ])
  const facilities = useFacilityLookup()
  const zones = useZoneLookup(list.filters['facility_id'] ?? null)

  const columns: DataTableColumn<InventoryRow>[] = [
    {
      id: 'pallet',
      header: 'Pallet',
      priority: 1,
      accessor: (row) => (
        <PalletIdentity
          pallet={{
            id: row.pallet_id,
            palletNumber: row.pallet_number ?? '—',
            jobNumber: row.job_number,
          }}
          variant="stacked"
          showStatus={false}
        />
      ),
    },
    { id: 'customer', header: 'Customer', priority: 2, truncate: true, accessor: (r) => r.customer_name ?? '—' },
    { id: 'lpo', header: 'LPO', priority: 3, accessor: (r) => r.lpo_number ?? '—' },
    {
      id: 'location',
      header: 'Location',
      priority: 1,
      accessor: (row) => (
        <LocationRef
          location={{
            id: row.location_id,
            code: row.location_code ?? '—',
            facilityName: row.facility_name,
            zoneName: row.zone_name,
            state: 'occupied',
          }}
          variant="stacked"
        />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      priority: 1,
      accessor: (row) => <StatusBadge status={statusKeyOf(row.display_status)} />,
    },
    { id: 'putaway', header: 'Put away', priority: 3, accessor: (r) => formatDateTime(r.putaway_at) },
    { id: 'moved', header: 'Last movement', priority: 2, accessor: (r) => formatDateTime(r.last_movement_at) },
    {
      id: 'ageing',
      header: 'Age',
      priority: 1,
      align: 'right',
      sortable: true,
      sortKey: 'putaway_at',
      accessor: (row) => <AgeingIndicator days={row.ageing_days} putAwayDate={formatDateTime(row.putaway_at)} />,
    },
    { id: 'user', header: 'Last action', priority: 3, accessor: (r) => r.last_action_by ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={<Boxes className="size-5" />}
        title="Live Inventory"
        context={`${formatNumber(list.pagination.total)} pallet${list.pagination.total === 1 ? '' : 's'} currently stored`}
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Live Inventory' }]}
        meta={
          list.hasFilters ? (
            <span className="rounded-full bg-anodic-50 px-2 py-0.5 text-caption text-anodic-700">
              Filtered
            </span>
          ) : null
        }
      />

      <Panel className="shadow-card">
        <div className="flex flex-col gap-3">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search pallet, job, customer or LPO…"
          />
          <FilterBar
            activeFilters={Object.entries(list.filters).map(([id, value]) => ({
              id,
              label: id.replace('_', ' '),
              value,
            }))}
            onRemoveFilter={(id) => list.setFilter(id, null)}
            onClearAll={list.clearFilters}
          >
            <Select
              ariaLabel="Facility"
              placeholder="All facilities"
              value={list.filters['facility_id'] ?? 'all'}
              onValueChange={(v) => {
                list.setFilter('facility_id', v === 'all' ? null : v)
                list.setFilter('zone_id', null)
              }}
              options={[
                { value: 'all', label: 'All facilities' },
                ...(facilities.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })),
              ]}
              className="w-48"
            />
            <Select
              ariaLabel="Zone"
              placeholder="All zones"
              disabled={!list.filters['facility_id']}
              value={list.filters['zone_id'] ?? 'all'}
              onValueChange={(v) => list.setFilter('zone_id', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: 'All zones' },
                ...(zones.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })),
              ]}
              className="w-44"
            />
            <Select
              ariaLabel="Status"
              placeholder="All statuses"
              value={list.filters['status'] ?? 'all'}
              onValueChange={(v) => list.setFilter('status', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'STORED', label: 'Stored' },
                { value: 'STAGED_FOR_DISPATCH', label: 'Staged for dispatch' },
                { value: 'ON_HOLD', label: 'On hold' },
                { value: 'DAMAGED', label: 'Damaged' },
                { value: 'EXCEPTION', label: 'Exception' },
              ]}
              className="w-44"
            />
            <Select
              ariaLabel="Ageing"
              placeholder="Any age"
              value={list.filters['ageing'] ?? 'all'}
              onValueChange={(v) => list.setFilter('ageing', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: 'Any age' },
                { value: 'fresh', label: '0–7 days' },
                { value: 'normal', label: '8–15 days' },
                { value: 'attention', label: '16–30 days' },
                { value: 'critical', label: 'Over 30 days' },
              ]}
              className="w-40"
            />
          </FilterBar>
        </div>
      </Panel>

      <Panel padded={false} className="overflow-hidden shadow-card">
        <DataTable
          dataset="inventory"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.pallet_id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message, traceId: list.error.traceId } : null}
          onRetry={() => void list.refetch()}
          onRowClick={(row) => router.push(`/pallets/${row.pallet_id}`)}
          caption="Live inventory"
          rowActions={(row) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="Actions" size="sm" icon={<MoreHorizontal className="size-4" />} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => router.push(`/pallets/${row.pallet_id}`)}>
                  View pallet
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/locations/${row.location_id}`)}>
                  View location
                </DropdownMenuItem>
                {can('transfer.perform') ? (
                  <DropdownMenuItem
                    onSelect={() => router.push(`/transactions/movement?pallet=${row.pallet_number ?? ''}`)}
                  >
                    Move pallet
                  </DropdownMenuItem>
                ) : null}
                {can('dispatch.perform') ? (
                  <DropdownMenuItem
                    onSelect={() => router.push(`/transactions/dispatch?pallet=${row.pallet_number ?? ''}`)}
                  >
                    Dispatch pallet
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          emptyState={
            list.hasFilters ? (
              <EmptyState
                variant="no-results"
                title="No pallets match these filters"
                description="Clear the filters to see all stored pallets."
                action={
                  <Button variant="primary" onClick={list.clearFilters}>
                    Clear all filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                variant="no-data"
                title="No pallets in inventory yet"
                description="Inventory appears here as soon as the first pallet is put away."
                action={
                  can('putaway.perform') ? (
                    <Button variant="primary" onClick={() => router.push('/transactions/put-away')}>
                      Record a put-away
                    </Button>
                  ) : undefined
                }
              />
            )
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
