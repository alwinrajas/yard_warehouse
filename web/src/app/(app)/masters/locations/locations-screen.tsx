'use client'

import { MoreHorizontal, Plus, Upload } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { LocationRef } from '@/components/domain/location-ref'
import { PermissionGate } from '@/components/domain/permission-gate'
import {
  Badge,
  Button,
  Combobox,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Select,
  type DataTableColumn,
} from '@/components/ui'
import { MasterPage } from '@/features/masters/master-page'
import { RecordStatus } from '@/features/masters/status-cell'
import { useFacilityLookup, useZoneLookup } from '@/features/masters/use-lookups'
import { useMasterList } from '@/features/masters/use-master-list'
import { useMasterMutation } from '@/features/masters/use-master-mutations'
import { LOCATION_TYPE_LABELS, type LocationRecord } from '@/lib/api/types'
import { usePermission } from '@/lib/permissions/session'

import { BlockLocationDialog } from './block-dialog'
import { LocationFormDrawer } from './location-form'

/** W-23 Location Master (docs/23 §10). */
export function LocationsScreen() {
  const can = usePermission()
  const list = useMasterList<LocationRecord>('locations', {
    filterKeys: ['status', 'blocked', 'facility_id', 'zone_id', 'location_type'],
    defaultSort: 'code',
  })
  const facilities = useFacilityLookup()
  const zones = useZoneLookup(list.filters['facility_id'] ?? null)

  const [editing, setEditing] = useState<LocationRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const [blocking, setBlocking] = useState<LocationRecord | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LocationRecord | null>(null)

  const setStatus = useMasterMutation<{ location: LocationRecord; active: boolean }, LocationRecord>(
    'locations',
    ({ location, active }) => ({
      path: `/api/proxy/locations/${location.id}/status`,
      method: 'POST',
      body: { is_active: active },
    }),
  )

  const unblock = useMasterMutation<LocationRecord, LocationRecord>('locations', (location) => ({
    path: `/api/proxy/locations/${location.id}/unblock`,
    method: 'POST',
  }))

  const remove = useMasterMutation<LocationRecord, unknown>('locations', (location) => ({
    path: `/api/proxy/locations/${location.id}`,
    method: 'DELETE',
  }))

  const columns: DataTableColumn<LocationRecord>[] = [
    {
      id: 'code',
      header: 'Location',
      priority: 1,
      sortable: true,
      accessor: (row) => (
        <LocationRef
          location={{
            id: row.id,
            code: row.code,
            facilityName: row.facility_name ?? null,
            zoneName: row.zone_name ?? null,
            state: row.state,
            capacity: row.capacity,
          }}
          variant="stacked"
        />
      ),
    },
    {
      id: 'type',
      header: 'Type',
      priority: 2,
      accessor: (row) => <Badge tone="outline">{LOCATION_TYPE_LABELS[row.location_type]}</Badge>,
    },
    {
      id: 'capacity',
      header: 'Capacity',
      priority: 3,
      align: 'right',
      accessor: (row) =>
        row.capacity === null ? (
          <span className="text-graphite-500">Not defined</span>
        ) : (
          <span className="tabular-nums">{row.capacity}</span>
        ),
    },
    {
      id: 'sequence',
      header: 'Sequence',
      priority: 3,
      align: 'right',
      sortable: true,
      accessor: (row) => <span className="tabular-nums">{row.sequence}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      priority: 1,
      accessor: (row) => <RecordStatus active={row.is_active} blocked={row.is_blocked} />,
    },
    {
      id: 'reason',
      header: 'Block reason',
      priority: 3,
      truncate: true,
      accessor: (row) => row.blocked_reason ?? '—',
    },
  ]

  const activeFilters = Object.entries(list.filters)
    .filter(([, value]) => Boolean(value))
    .map(([id, value]) => ({
      id,
      label:
        id === 'facility_id'
          ? 'Facility'
          : id === 'zone_id'
            ? 'Zone'
            : id === 'location_type'
              ? 'Type'
              : id === 'blocked'
                ? 'Blocked'
                : 'Status',
      value:
        id === 'facility_id'
          ? (facilities.data?.items.find((f) => f.id === value)?.name ?? value!)
          : id === 'zone_id'
            ? (zones.data?.items.find((z) => z.id === value)?.name ?? value!)
            : value!,
    }))

  return (
    <>
      <MasterPage
        title="Locations"
        breadcrumbs={[{ label: 'Configuration' }, { label: 'Locations' }]}
        context={`${list.pagination.total} location${list.pagination.total === 1 ? '' : 's'} — the storage positions pallets are put away to`}
        primaryAction={
          <div className="flex items-center gap-2">
            <PermissionGate permission="location.import">
              <Button variant="secondary" leftIcon={<Upload className="size-4" />} asChild>
                <Link href="/masters/locations/import">Import</Link>
              </Button>
            </PermissionGate>
            <PermissionGate permission="location.create">
              <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                New location
              </Button>
            </PermissionGate>
          </div>
        }
        dataset="locations"
        columns={columns}
        rows={list.rows}
        getRowId={(row) => row.id}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        search={list.search}
        onSearchChange={(value) => list.url.set({ search: value })}
        searchPlaceholder="Search location code…"
        filters={
          <>
            <Combobox
              ariaLabel="Facility"
              clearable
              options={(facilities.data?.items ?? []).map((facility) => ({
                value: facility.id,
                label: facility.name,
                description: facility.code,
              }))}
              value={list.filters['facility_id'] ?? null}
              onValueChange={(value) => list.url.set({ facility_id: value, zone_id: null })}
              placeholder="All facilities"
              className="w-52"
            />
            <Combobox
              ariaLabel="Zone"
              clearable
              options={(zones.data?.items ?? []).map((zone) => ({
                value: zone.id,
                label: zone.name,
                description: zone.code,
              }))}
              value={list.filters['zone_id'] ?? null}
              onValueChange={(value) => list.url.set({ zone_id: value })}
              disabled={!list.filters['facility_id']}
              placeholder={list.filters['facility_id'] ? 'All zones' : 'Select a facility first'}
              className="w-48"
            />
            <Select
              ariaLabel="Location type"
              placeholder="All types"
              value={list.filters['location_type'] ?? 'all'}
              onValueChange={(value) => list.url.set({ location_type: value === 'all' ? null : value })}
              options={[
                { value: 'all', label: 'All types' },
                ...Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              className="w-40"
            />
            <Select
              ariaLabel="Status"
              placeholder="All statuses"
              value={list.filters['status'] ?? 'all'}
              onValueChange={(value) => list.url.set({ status: value === 'all' ? null : value })}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              className="w-36"
            />
            <Select
              ariaLabel="Blocked"
              placeholder="Blocked or not"
              value={list.filters['blocked'] ?? 'all'}
              onValueChange={(value) => list.url.set({ blocked: value === 'all' ? null : value })}
              options={[
                { value: 'all', label: 'Blocked or not' },
                { value: 'blocked', label: 'Blocked only' },
                { value: 'unblocked', label: 'Not blocked' },
              ]}
              className="w-40"
            />
          </>
        }
        activeFilters={activeFilters}
        onRemoveFilter={(id) => list.url.set({ [id]: null })}
        onClearFilters={() => list.url.clear()}
        sort={list.sort}
        onSortChange={(sort) => list.url.set({ sort: sort?.key ?? null, dir: sort?.direction ?? null })}
        onRowClick={(row) => setEditing(row)}
        selectedRowId={editing?.id ?? null}
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label="Actions" size="sm" icon={<MoreHorizontal className="size-4" />} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setEditing(row)}>
                {can('location.edit') ? 'Edit' : 'View'}
              </DropdownMenuItem>
              {can('location.block') ? (
                row.is_blocked ? (
                  <DropdownMenuItem onSelect={() => unblock.mutate(row)}>Unblock</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setBlocking(row)}>Block</DropdownMenuItem>
                )
              ) : null}
              {can('location.edit') ? (
                <DropdownMenuItem onSelect={() => setStatus.mutate({ location: row, active: !row.is_active })}>
                  {row.is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
              ) : null}
              {can('location.delete') ? (
                <DropdownMenuItem tone="danger" onSelect={() => setConfirmDelete(row)}>
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyState={
          list.hasFilters ? (
            <EmptyState
              variant="no-results"
              title="No locations match these filters"
              action={
                <Button variant="primary" onClick={() => list.url.clear()}>
                  Clear all filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="no-data"
              title="No locations yet"
              description="Locations are the storage positions pallets are put away to. Import an existing yard layout, or add them one at a time."
              action={
                can('location.import') ? (
                  <Button variant="primary" asChild>
                    <Link href="/masters/locations/import">Import locations</Link>
                  </Button>
                ) : undefined
              }
              secondaryAction={
                can('location.create') ? (
                  <Button variant="secondary" onClick={() => setCreating(true)}>
                    Add one location
                  </Button>
                ) : undefined
              }
            />
          )
        }
        pagination={list.pagination}
        onPageChange={(page) => list.url.set({ page }, { resetPage: false })}
        onPageSizeChange={(size) => list.url.set({ pageSize: size })}
      />

      <LocationFormDrawer
        open={creating || editing !== null}
        location={editing}
        readOnly={editing !== null && !can('location.edit')}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <BlockLocationDialog
        location={blocking}
        onClose={() => setBlocking(null)}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Delete location ${confirmDelete?.code ?? ''}?`}
        description="Location identity is permanent once inventory references it. Deleting removes it from the master."
        confirmLabel="Delete location"
        tone="danger"
        typeToConfirm={confirmDelete?.code}
        typeToConfirmLabel="Type the location code to confirm"
        loading={remove.isPending}
        onConfirm={() => {
          if (!confirmDelete) return
          remove.mutate(confirmDelete, { onSettled: () => setConfirmDelete(null) })
        }}
      />
    </>
  )
}
