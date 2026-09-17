'use client'

import { MapPin } from 'lucide-react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { LocationRef } from '@/components/domain/location-ref'
import { PageHeader } from '@/components/layout/page-header'
import {
  DataTable,
  DataTableToolbar,
  EmptyState,
  FilterBar,
  Pagination,
  Panel,
  Select,
  type DataTableColumn,
} from '@/components/ui'
import { useFacilityLookup, useZoneLookup } from '@/features/masters/use-lookups'
import { useApiList } from '@/features/shared/use-api'
import { LOCATION_TYPE_LABELS, type LocationRecord } from '@/lib/api/types'
import { formatNumber } from '@/lib/format'

const FILTER_KEYS = ['facility_id', 'zone_id', 'location_type', 'blocked'] as const

const FILTER_LABELS: Record<string, string> = {
  facility_id: 'Facility',
  zone_id: 'Zone',
  location_type: 'Type',
  blocked: 'Blocked',
}

/**
 * W-05 Location Directory (docs/23 §6).
 *
 * The operational view of the yard: what each location is and whether anything
 * is in it. Creating and editing locations lives under Configuration — this
 * screen is deliberately read-only so a supervisor looking something up cannot
 * change the layout by accident.
 */
export function LocationDirectory() {
  const router = useRouter()
  const list = useApiList<LocationRecord>('location-directory', '/api/proxy/locations', [...FILTER_KEYS])
  const facilities = useFacilityLookup()
  const zones = useZoneLookup(list.filters['facility_id'] ?? null)

  const columns: DataTableColumn<LocationRecord>[] = [
    {
      id: 'code',
      header: 'Location',
      priority: 1,
      accessor: (row) => (
        <LocationRef
          location={{
            id: row.id,
            code: row.code,
            facilityName: row.facility_name,
            zoneName: row.zone_name,
            state: row.state,
            palletCount: row.occupied_count ?? null,
            capacity: row.capacity,
          }}
        />
      ),
    },
    {
      id: 'placement',
      header: 'Facility / zone',
      priority: 2,
      accessor: (row) => (
        <span className="text-body-sm text-graphite-600">
          {[row.facility_name, row.zone_name].filter(Boolean).join(' › ') || '—'}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      priority: 3,
      accessor: (row) => LOCATION_TYPE_LABELS[row.location_type] ?? row.location_type,
    },
    {
      id: 'occupancy',
      header: 'Pallets',
      priority: 1,
      align: 'right',
      accessor: (row) => (
        <span className="tabular-nums text-graphite-800">
          {formatNumber(row.occupied_count ?? 0)}
          {row.capacity !== null ? (
            <span className="text-graphite-500"> / {formatNumber(row.capacity)}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'condition',
      header: 'Condition',
      priority: 2,
      accessor: (row) =>
        !row.is_active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-graphite-200 bg-graphite-100/90 px-2.5 py-0.5 text-caption font-semibold text-graphite-600">
            <span className="size-1.5 rounded-full bg-graphite-400" aria-hidden />
            Inactive
          </span>
        ) : row.is_blocked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-danger-border bg-signal-danger-surface px-2.5 py-0.5 text-caption font-semibold text-signal-danger-fg">
            <span className="size-1.5 rounded-full bg-signal-danger-fg" aria-hidden />
            Blocked{row.blocked_reason ? ` · ${row.blocked_reason}` : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-success-border bg-signal-success-surface px-2.5 py-0.5 text-caption font-semibold text-signal-success-fg">
            <span className="size-1.5 rounded-full bg-signal-success-fg" aria-hidden />
            Available
          </span>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<MapPin className="size-5" />}
        title="Locations"
        context={`${formatNumber(list.pagination.total)} location${list.pagination.total === 1 ? '' : 's'}`}
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Locations' }]}
        actions={
          <Link
            href="/location-occupancy"
            className="text-body-sm text-anodic-600 underline-offset-2 hover:underline"
          >
            View occupancy board
          </Link>
        }
      />

      <Panel padded={false} className="overflow-hidden shadow-card">
        <div className="flex flex-col gap-3 p-4">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search by location code or description…"
          />
          <FilterBar
            activeFilters={Object.entries(list.filters).map(([id, value]) => ({
              id,
              label: FILTER_LABELS[id] ?? id,
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
              ariaLabel="Condition"
              placeholder="Any condition"
              value={list.filters['blocked'] ?? 'all'}
              onValueChange={(v) => list.setFilter('blocked', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: 'Any condition' },
                { value: 'blocked', label: 'Blocked only' },
                { value: 'unblocked', label: 'Not blocked' },
              ]}
              className="w-44"
            />
          </FilterBar>
        </div>

        <DataTable
          dataset="locations"
          columns={columns}
          rows={list.rows}
          getRowId={(row) => row.id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message } : null}
          onRetry={() => void list.refetch()}
          caption="Locations"
          onRowClick={(row) => router.push(`/locations/${row.id}`)}
          emptyState={
            <EmptyState
              variant={list.search || Object.keys(list.filters).length > 0 ? 'no-results' : 'no-data'}
              title={
                list.search || Object.keys(list.filters).length > 0
                  ? 'No location matches these filters'
                  : 'No locations configured yet'
              }
              description={
                list.search || Object.keys(list.filters).length > 0
                  ? 'Clear a filter, or check the location code.'
                  : 'Locations are created under Configuration, or imported in bulk.'
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
