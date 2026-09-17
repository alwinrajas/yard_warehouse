'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { PermissionGate } from '@/components/domain/permission-gate'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Panel,
  type DataTableColumn,
} from '@/components/ui'
import { useApi, useApiMutation } from '@/features/shared/use-api'
import type { RoleRow } from '@/lib/api/admin-types'
import { formatNumber } from '@/lib/format'
import { useSession } from '@/lib/permissions/session'

import { RoleEditor } from './role-editor'

/**
 * W-28 Roles & Permissions (S-40, docs/07).
 *
 * The screen shows what a role can do; the API decides what may be granted. Two
 * refusals are enforced server-side and surfaced here so they are not a surprise
 * at save time: nobody may grant a permission they do not hold, and nobody may
 * edit the role they are signed in under.
 */
export function RolesScreen() {
  const session = useSession()
  const { data, isLoading, error, refetch } = useApi<RoleRow[]>(['roles'], '/api/proxy/roles')
  const [editing, setEditing] = useState<RoleRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<RoleRow | null>(null)

  const remove = useApiMutation<string, { deleted: boolean }>(
    (id) => ({ path: `/api/proxy/roles/${id}`, method: 'DELETE' }),
    ['roles'],
  )

  const rows = data ?? []

  const columns: DataTableColumn<RoleRow>[] = [
    {
      id: 'name',
      header: 'Role',
      priority: 1,
      accessor: (row) => (
        <div className="min-w-0">
          <span className="block text-body-sm font-medium text-graphite-900">{row.name}</span>
          <span className="block font-mono text-caption text-graphite-500">{row.code}</span>
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      priority: 3,
      accessor: (row) => (
        <span className="text-body-sm text-graphite-600">{row.description ?? '—'}</span>
      ),
    },
    {
      id: 'permissions',
      header: 'Permissions',
      priority: 1,
      align: 'right',
      accessor: (row) => (
        <span className="tabular-nums text-graphite-800">{formatNumber(row.permission_count ?? 0)}</span>
      ),
    },
    {
      id: 'users',
      header: 'Users',
      priority: 2,
      align: 'right',
      accessor: (row) => (
        <span className="tabular-nums text-graphite-800">{formatNumber(row.user_count ?? 0)}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      priority: 2,
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge tone={row.is_active ? 'neutral' : 'outline'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {row.is_system ? <Badge tone="info">Built-in</Badge> : null}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles & Permissions"
        context={`${formatNumber(rows.length)} role${rows.length === 1 ? '' : 's'}`}
        breadcrumbs={[{ label: 'Configuration', href: '/masters' }, { label: 'Roles & Permissions' }]}
        actions={
          <PermissionGate permission="role.create">
            <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              New role
            </Button>
          </PermissionGate>
        }
      />

      <Alert tone="info" title="Permission changes take effect on the user's next request">
        A role can only be granted permissions you hold yourself, and you cannot change the role you
        are signed in under — both are enforced by the server, not by this screen.
      </Alert>

      <Panel padded={false} className="overflow-hidden shadow-card">
        <DataTable
          dataset="users"
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={isLoading}
          error={error ? { code: error.code, message: error.message } : null}
          onRetry={() => void refetch()}
          caption="Roles"
          onRowClick={(row) => setEditing(row)}
          rowActions={(row) => (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                {row.code === session?.role ? 'View' : 'Edit'}
              </Button>
              {!row.is_system ? (
                <PermissionGate permission="role.delete">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(row)}>
                    Delete
                  </Button>
                </PermissionGate>
              ) : null}
            </div>
          )}
          emptyState={
            <EmptyState
              variant="no-data"
              title="No roles configured"
              description="The five BRD roles are seeded with the application."
            />
          }
        />
      </Panel>

      {creating ? <RoleEditor role={null} onClose={() => setCreating(false)} /> : null}
      {editing ? <RoleEditor role={editing} onClose={() => setEditing(null)} /> : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name ?? ''}?`}
        description="A role with users assigned cannot be deleted. Move its users to another role first."
        confirmLabel="Delete role"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() =>
          confirmDelete &&
          remove.mutate(confirmDelete.id, { onSettled: () => setConfirmDelete(null) })
        }
      />
    </div>
  )
}
