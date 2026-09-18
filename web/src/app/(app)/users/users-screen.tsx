'use client'

import { UserCog } from 'lucide-react'

import { useState } from 'react'

import { PermissionGate } from '@/components/domain/permission-gate'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  Drawer,
  EmptyState,
  Pagination,
  Panel,
  Select,
  StatPanel,
  type DataTableColumn,
} from '@/components/ui'
import { useApi, useApiList, useApiMutation } from '@/features/shared/use-api'
import type { UserRow } from '@/lib/api/inventory-types'
import { formatDateTime, formatNumber } from '@/lib/format'

type RolesResponse = {
  roles: { id: string; code: string; name: string; description: string | null; is_system: boolean; user_count: number; permissions: string[] }[]
  permissions: { code: string; module: string; description: string }[]
}

/** W-27 / W-28 Users and RBAC (docs/23 §10). */
export function UsersScreen() {
  const list = useApiList<UserRow>('users', '/api/proxy/users', ['status', 'role_id'])
  const roles = useApi<RolesResponse>(['roles'], '/api/proxy/users/roles')
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [reset, setReset] = useState<{ user: string; password: string } | null>(null)

  const setActive = useApiMutation<{ id: string; active: boolean }, unknown>(
    ({ id, active }) => ({ path: `/api/proxy/users/${id}/status`, body: { is_active: active } }),
    ['users'],
  )
  const resetPassword = useApiMutation<UserRow, { temporary_password: string }>(
    (user) => ({ path: `/api/proxy/users/${user.id}/reset-password` }),
    ['users'],
  )

  const columns: DataTableColumn<UserRow>[] = [
    {
      id: 'name',
      header: 'User',
      priority: 1,
      accessor: (r) => (
        <div className="min-w-0">
          <span className="block text-body-sm text-graphite-900">{r.name}</span>
          <span className="block font-mono text-caption text-graphite-500">{r.username}</span>
        </div>
      ),
    },
    { id: 'role', header: 'Role', priority: 1, accessor: (r) => <Badge tone="outline">{r.role_name ?? '—'}</Badge> },
    { id: 'site', header: 'Site', priority: 2, accessor: (r) => r.site_name ?? 'All sites' },
    {
      id: 'facilities',
      header: 'Facility access',
      priority: 3,
      truncate: true,
      accessor: (r) =>
        (r.facilities ?? []).length === 0
          ? 'All in site'
          : r.facilities!.map((x) => x.code).join(', '),
    },
    {
      id: 'status',
      header: 'Status',
      priority: 1,
      accessor: (r) => (
        <Badge tone={r.is_locked ? 'warning' : r.is_active ? 'neutral' : 'outline'}>
          {r.is_locked ? 'Locked' : r.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    { id: 'login', header: 'Last sign-in', priority: 2, accessor: (r) => formatDateTime(r.last_login_at) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<UserCog className="size-5" />}
        title="Users & Roles"
        context={`${formatNumber(list.pagination.total)} account${list.pagination.total === 1 ? '' : 's'} — individual credentials only, never shared`}
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
      />

      {reset ? (
        <Alert tone="warning" title={`Temporary password for ${reset.user}`} live>
          <span className="font-mono text-mono-lg">{reset.password}</span>
          <p className="mt-1">
            Shown once and never stored in plain text. The user must change it at next sign-in.
          </p>
        </Alert>
      ) : null}

      <Panel padded={false} className="overflow-hidden shadow-card">
        <div className="flex flex-col gap-3 p-4">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search name, username or employee code…"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              ariaLabel="Role"
              placeholder="All roles"
              value={list.filters['role_id'] ?? 'all'}
              onValueChange={(v) => list.setFilter('role_id', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: 'All roles' },
                ...(roles.data?.roles ?? []).map((r) => ({ value: r.id, label: r.name })),
              ]}
              className="w-52"
            />
            <Select
              ariaLabel="Status"
              placeholder="All statuses"
              value={list.filters['status'] ?? 'all'}
              onValueChange={(v) => list.setFilter('status', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              className="w-40"
            />
          </div>
        </div>

        <DataTable
          dataset="users"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message } : null}
          onRetry={() => void list.refetch()}
          onRowClick={setSelected}
          selectedRowId={selected?.id ?? null}
          caption="Users"
          emptyState={<EmptyState variant="no-data" title="No users found" />}
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

      <Panel className="shadow-card">
        <h2 className="text-h3 text-graphite-800">Roles and permissions</h2>
        <p className="mt-1 text-body-sm text-graphite-500">
          Permissions are enforced by the API on every request. What the interface shows or hides is
          a convenience, not the security boundary.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(roles.data?.roles ?? []).map((role) => (
            <div key={role.id} className="rounded-xl border border-graphite-200/80 bg-graphite-25 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-body-sm font-medium text-graphite-900">{role.name}</h3>
                <span className="font-mono text-caption text-graphite-500">{role.code}</span>
              </div>
              <p className="mt-1 text-caption text-graphite-500">{role.description}</p>
              <p className="mt-2 text-caption text-graphite-600">
                {role.user_count} user{role.user_count === 1 ? '' : 's'} ·{' '}
                {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Drawer
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected?.username}
        footer={
          selected ? (
            <PermissionGate permission="user.edit">
              <>
                <Button
                  variant="ghost"
                  loading={resetPassword.isPending}
                  onClick={() =>
                    resetPassword.mutate(selected, {
                      onSuccess: (data) =>
                        setReset({ user: selected.username, password: data.temporary_password }),
                    })
                  }
                >
                  Reset password
                </Button>
                <Button
                  variant={selected.is_active ? 'danger' : 'primary'}
                  loading={setActive.isPending}
                  onClick={() =>
                    setActive.mutate(
                      { id: selected.id, active: !selected.is_active },
                      { onSuccess: () => setSelected(null) },
                    )
                  }
                >
                  {selected.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </>
            </PermissionGate>
          ) : null
        }
      >
        {selected ? (
          <div className="flex flex-col gap-5 p-5">
            {selected.is_active ? null : (
              <Alert tone="warning" title="This account is inactive">
                The user cannot sign in, and any active session was ended immediately.
              </Alert>
            )}
            <StatPanel
              stats={[
                { label: 'Name', value: selected.name },
                { label: 'Username', value: selected.username, mono: true },
                { label: 'Employee code', value: selected.employee_code ?? '—' },
                { label: 'Role', value: selected.role_name ?? '—' },
                { label: 'Site', value: selected.site_name ?? 'All sites' },
                { label: 'Last sign-in', value: formatDateTime(selected.last_login_at) },
              ]}
            />
            <div>
              <p className="text-overline uppercase text-graphite-500">Facility access</p>
              <p className="mt-1 text-body-sm text-graphite-700">
                {(selected.facilities ?? []).length === 0
                  ? 'All facilities within their site'
                  : selected.facilities!.map((f) => f.name).join(', ')}
              </p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
