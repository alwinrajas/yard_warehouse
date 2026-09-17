'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { PermissionGate } from '@/components/domain/permission-gate'
import {
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
import { useMasterList } from '@/features/masters/use-master-list'
import { useMasterMutation } from '@/features/masters/use-master-mutations'
import type { Site } from '@/lib/api/types'
import { formatDate } from '@/lib/format'
import { usePermission } from '@/lib/permissions/session'

import { SiteFormDrawer } from './site-form'
import { MoreHorizontal } from 'lucide-react'

/** W-20 Site / Plant Master (docs/23 §10). */
export function SitesScreen() {
  const can = usePermission()
  const list = useMasterList<Site>('sites', { filterKeys: ['status'], defaultSort: 'code' })
  const [editing, setEditing] = useState<Site | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Site | null>(null)

  const setStatus = useMasterMutation<{ site: Site; active: boolean }, Site>('sites', ({ site, active }) => ({
    path: `/api/proxy/sites/${site.id}/status`,
    method: 'POST',
    body: { is_active: active },
  }))

  const remove = useMasterMutation<Site, unknown>('sites', (site) => ({
    path: `/api/proxy/sites/${site.id}`,
    method: 'DELETE',
  }))

  const columns: DataTableColumn<Site>[] = [
    {
      id: 'code',
      header: 'Site code',
      priority: 1,
      sortable: true,
      accessor: (row) => <span className="font-mono text-mono text-graphite-900">{row.code}</span>,
    },
    { id: 'name', header: 'Name', priority: 1, sortable: true, truncate: true, accessor: (row) => row.name },
    { id: 'address', header: 'Address', priority: 3, truncate: true, accessor: (row) => row.address ?? '—' },
    {
      id: 'facilities',
      header: 'Facilities',
      priority: 2,
      align: 'right',
      accessor: (row) => <span className="tabular-nums">{row.facility_count ?? 0}</span>,
    },
    { id: 'status', header: 'Status', priority: 1, accessor: (row) => <RecordStatus active={row.is_active} /> },
    {
      id: 'created',
      header: 'Created',
      priority: 3,
      accessor: (row) => formatDate(row.created_at),
    },
  ]

  return (
    <>
      <MasterPage
        title="Sites"
        breadcrumbs={[{ label: 'Configuration' }, { label: 'Sites' }]}
        context={`${list.pagination.total} site${list.pagination.total === 1 ? '' : 's'}`}
        primaryAction={
          <PermissionGate permission="site.create">
            <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              New site
            </Button>
          </PermissionGate>
        }
        dataset="sites"
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
            className="w-44"
          />
        }
        activeFilters={
          list.filters['status']
            ? [{ id: 'status', label: 'Status', value: list.filters['status'] }]
            : []
        }
        onRemoveFilter={(id) => list.url.set({ [id]: null })}
        onClearFilters={() => list.url.clear()}
        sort={list.sort}
        onSortChange={(sort) => list.url.set({ sort: sort?.key ?? null, dir: sort?.direction ?? null })}
        onRowClick={can('site.edit') ? (row) => setEditing(row) : undefined}
        selectedRowId={editing?.id ?? null}
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label="Actions" size="sm" icon={<MoreHorizontal className="size-4" />} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setEditing(row)}>
                {can('site.edit') ? 'Edit' : 'View'}
              </DropdownMenuItem>
              {can('site.edit') ? (
                <DropdownMenuItem onSelect={() => setStatus.mutate({ site: row, active: !row.is_active })}>
                  {row.is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
              ) : null}
              {can('site.delete') ? (
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
              title="No sites match these filters"
              description="Clear the filters to see every site."
              action={
                <Button variant="primary" onClick={() => list.url.clear()}>
                  Clear all filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="no-data"
              title="No sites yet"
              description="A site is the plant your yards and warehouses belong to. Create one to begin building the location hierarchy."
              action={
                can('site.create') ? (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    Create the first site
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

      <SiteFormDrawer
        open={creating || editing !== null}
        site={editing}
        readOnly={editing !== null && !can('site.edit')}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Delete site ${confirmDelete?.code ?? ''}?`}
        description="This cannot be undone. A site with facilities cannot be deleted."
        confirmLabel="Delete site"
        tone="danger"
        typeToConfirm={confirmDelete?.code}
        typeToConfirmLabel="Type the site code to confirm"
        loading={remove.isPending}
        onConfirm={() => {
          if (!confirmDelete) return
          remove.mutate(confirmDelete, { onSettled: () => setConfirmDelete(null) })
        }}
      />
    </>
  )
}
