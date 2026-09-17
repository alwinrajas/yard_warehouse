'use client'

import { MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'

import { PermissionGate } from '@/components/domain/permission-gate'
import {
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
import { useFacilityLookup } from '@/features/masters/use-lookups'
import { useMasterList } from '@/features/masters/use-master-list'
import { useMasterMutation } from '@/features/masters/use-master-mutations'
import type { Zone } from '@/lib/api/types'
import { usePermission } from '@/lib/permissions/session'

import { ZoneFormDrawer } from './zone-form'

/** W-22 Zone / Area Master (docs/23 §10). */
export function ZonesScreen() {
  const can = usePermission()
  const list = useMasterList<Zone>('zones', { filterKeys: ['status', 'facility_id'], defaultSort: 'sequence' })
  const facilities = useFacilityLookup()
  const [editing, setEditing] = useState<Zone | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Zone | null>(null)

  const setStatus = useMasterMutation<{ zone: Zone; active: boolean }, Zone>('zones', ({ zone, active }) => ({
    path: `/api/proxy/zones/${zone.id}/status`,
    method: 'POST',
    body: { is_active: active },
  }))

  const remove = useMasterMutation<Zone, unknown>('zones', (zone) => ({
    path: `/api/proxy/zones/${zone.id}`,
    method: 'DELETE',
  }))

  const columns: DataTableColumn<Zone>[] = [
    {
      id: 'code',
      header: 'Zone code',
      priority: 1,
      sortable: true,
      accessor: (row) => <span className="font-mono text-mono text-graphite-900">{row.code}</span>,
    },
    { id: 'name', header: 'Name', priority: 1, sortable: true, truncate: true, accessor: (row) => row.name },
    { id: 'facility', header: 'Facility', priority: 1, truncate: true, accessor: (row) => row.facility_name ?? '—' },
    {
      id: 'sequence',
      header: 'Sequence',
      priority: 3,
      align: 'right',
      sortable: true,
      accessor: (row) => <span className="tabular-nums">{row.sequence}</span>,
    },
    {
      id: 'locations',
      header: 'Locations',
      priority: 2,
      align: 'right',
      accessor: (row) => <span className="tabular-nums">{row.location_count ?? 0}</span>,
    },
    { id: 'status', header: 'Status', priority: 1, accessor: (row) => <RecordStatus active={row.is_active} /> },
  ]

  const activeFilters = Object.entries(list.filters)
    .filter(([, value]) => Boolean(value))
    .map(([id, value]) => ({
      id,
      label: id === 'facility_id' ? 'Facility' : 'Status',
      value:
        id === 'facility_id'
          ? (facilities.data?.items.find((f) => f.id === value)?.name ?? value!)
          : value!,
    }))

  return (
    <>
      <MasterPage
        title="Zones"
        breadcrumbs={[{ label: 'Configuration' }, { label: 'Zones' }]}
        context={`${list.pagination.total} zone${list.pagination.total === 1 ? '' : 's'} — subdivisions of a facility`}
        primaryAction={
          <PermissionGate permission="zone.create">
            <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              New zone
            </Button>
          </PermissionGate>
        }
        dataset="zones"
        columns={columns}
        rows={list.rows}
        getRowId={(row) => row.id}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        search={list.search}
        onSearchChange={(value) => list.url.set({ search: value })}
        searchPlaceholder="Search code or name…"
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
              onValueChange={(value) => list.url.set({ facility_id: value })}
              placeholder="All facilities"
              className="w-56"
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
                {can('zone.edit') ? 'Edit' : 'View'}
              </DropdownMenuItem>
              {can('zone.edit') ? (
                <DropdownMenuItem onSelect={() => setStatus.mutate({ zone: row, active: !row.is_active })}>
                  {row.is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
              ) : null}
              {can('zone.delete') ? (
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
              title="No zones match these filters"
              action={
                <Button variant="primary" onClick={() => list.url.clear()}>
                  Clear all filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="no-data"
              title="No zones yet"
              description="Zones divide a large yard or warehouse into manageable areas. A facility can also hold locations directly."
              action={
                can('zone.create') ? (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    Create the first zone
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

      <ZoneFormDrawer
        open={creating || editing !== null}
        zone={editing}
        readOnly={editing !== null && !can('zone.edit')}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Delete zone ${confirmDelete?.code ?? ''}?`}
        description="A zone that holds locations cannot be deleted."
        confirmLabel="Delete zone"
        tone="danger"
        typeToConfirm={confirmDelete?.code}
        loading={remove.isPending}
        onConfirm={() => {
          if (!confirmDelete) return
          remove.mutate(confirmDelete, { onSettled: () => setConfirmDelete(null) })
        }}
      />
    </>
  )
}
