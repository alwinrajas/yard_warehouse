'use client'

import { MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'

import { PermissionGate } from '@/components/domain/permission-gate'
import {
  Badge,
  Button,
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
import { useSiteLookup } from '@/features/masters/use-lookups'
import { useMasterList } from '@/features/masters/use-master-list'
import { useMasterMutation } from '@/features/masters/use-master-mutations'
import { FACILITY_TYPE_LABELS, type Facility, type FacilityType } from '@/lib/api/types'
import { usePermission } from '@/lib/permissions/session'

import { FacilityFormDrawer } from './facility-form'

/** W-21 Storage Facility Master (docs/23 §10). */
export function FacilitiesScreen() {
  const can = usePermission()
  const list = useMasterList<Facility>('facilities', {
    filterKeys: ['status', 'type', 'site_id'],
    defaultSort: 'code',
  })
  const sites = useSiteLookup()
  const [editing, setEditing] = useState<Facility | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Facility | null>(null)

  const setStatus = useMasterMutation<{ facility: Facility; active: boolean }, Facility>(
    'facilities',
    ({ facility, active }) => ({
      path: `/api/proxy/facilities/${facility.id}/status`,
      method: 'POST',
      body: { is_active: active },
    }),
  )

  const remove = useMasterMutation<Facility, unknown>('facilities', (facility) => ({
    path: `/api/proxy/facilities/${facility.id}`,
    method: 'DELETE',
  }))

  const columns: DataTableColumn<Facility>[] = [
    {
      id: 'code',
      header: 'Code',
      priority: 1,
      sortable: true,
      accessor: (row) => <span className="font-mono text-mono text-graphite-900">{row.code}</span>,
    },
    { id: 'name', header: 'Name', priority: 1, sortable: true, truncate: true, accessor: (row) => row.name },
    {
      id: 'type',
      header: 'Type',
      priority: 1,
      sortable: true,
      accessor: (row) => <Badge tone="outline">{FACILITY_TYPE_LABELS[row.type]}</Badge>,
    },
    { id: 'site', header: 'Site', priority: 2, truncate: true, accessor: (row) => row.site_name ?? '—' },
    {
      id: 'zones',
      header: 'Zones',
      priority: 2,
      align: 'right',
      accessor: (row) => <span className="tabular-nums">{row.zone_count ?? 0}</span>,
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
      label: id === 'site_id' ? 'Site' : id === 'type' ? 'Type' : 'Status',
      value:
        id === 'type'
          ? FACILITY_TYPE_LABELS[value as FacilityType]
          : id === 'site_id'
            ? (sites.data?.items.find((s) => s.id === value)?.name ?? value!)
            : value!,
    }))

  return (
    <>
      <MasterPage
        title="Facilities"
        breadcrumbs={[{ label: 'Configuration' }, { label: 'Facilities' }]}
        context={`${list.pagination.total} facilit${list.pagination.total === 1 ? 'y' : 'ies'} — open yards, warehouses, dispatch and collection areas`}
        primaryAction={
          <PermissionGate permission="facility.create">
            <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              New facility
            </Button>
          </PermissionGate>
        }
        dataset="facilities"
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
            <Select
              ariaLabel="Site"
              placeholder="All sites"
              value={list.filters['site_id'] ?? 'all'}
              onValueChange={(value) => list.url.set({ site_id: value === 'all' ? null : value })}
              options={[
                { value: 'all', label: 'All sites' },
                ...(sites.data?.items ?? []).map((site) => ({ value: site.id, label: site.name })),
              ]}
              className="w-48"
            />
            <Select
              ariaLabel="Facility type"
              placeholder="All types"
              value={list.filters['type'] ?? 'all'}
              onValueChange={(value) => list.url.set({ type: value === 'all' ? null : value })}
              options={[
                { value: 'all', label: 'All types' },
                ...Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              className="w-48"
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
                {can('facility.edit') ? 'Edit' : 'View'}
              </DropdownMenuItem>
              {can('facility.edit') ? (
                <DropdownMenuItem onSelect={() => setStatus.mutate({ facility: row, active: !row.is_active })}>
                  {row.is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
              ) : null}
              {can('facility.delete') ? (
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
              title="No facilities match these filters"
              action={
                <Button variant="primary" onClick={() => list.url.clear()}>
                  Clear all filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="no-data"
              title="No facilities yet"
              description="Add the open yards and warehouses that make up this site. Zones and locations belong to a facility."
              action={
                can('facility.create') ? (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    Create the first facility
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

      <FacilityFormDrawer
        open={creating || editing !== null}
        facility={editing}
        readOnly={editing !== null && !can('facility.edit')}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Delete facility ${confirmDelete?.code ?? ''}?`}
        description="A facility with zones or locations cannot be deleted."
        confirmLabel="Delete facility"
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
