'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { OperationError } from '@/features/operations/operation-error'
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Field,
  Input,
  SearchInput,
  Textarea,
} from '@/components/ui'
import { useApi } from '@/features/shared/use-api'
import { request } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import {
  PERMISSION_MODULE_LABELS,
  type PermissionGroup,
  type RoleRow,
} from '@/lib/api/admin-types'
import { usePermission, useSession } from '@/lib/permissions/session'

/**
 * Role detail and permission selection.
 *
 * Permissions the signed-in administrator does not hold are shown, disabled and
 * labelled — hiding them would make the role look smaller than it is, and the
 * server refuses to grant them either way.
 */
export function RoleEditor({ role, onClose }: { role: RoleRow | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const session = useSession()
  const can = usePermission()

  const isOwnRole = role !== null && role.code === session?.role
  const readOnly = isOwnRole || !can(role === null ? 'role.create' : 'role.edit')

  const groups = useApi<{ groups: PermissionGroup[] }>(['role-permissions'], '/api/proxy/roles/permissions')
  const detail = useApi<RoleRow>(['role', role?.id ?? 'new'], `/api/proxy/roles/${role?.id}`, role !== null)

  const [code, setCode] = useState(role?.code ?? '')
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string> | null>(null)

  // The detail response is the source of truth for the current grants; until it
  // arrives, nothing is shown as selected rather than guessing.
  const current = selected ?? new Set(detail.data?.permissions ?? [])

  function toggle(permissionCode: string, on: boolean) {
    const next = new Set(current)
    if (on) next.add(permissionCode)
    else next.delete(permissionCode)
    setSelected(next)
  }

  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (groups.data?.groups ?? [])
      .map((group) => ({
        ...group,
        permissions: term
          ? group.permissions.filter(
              (p) =>
                p.code.toLowerCase().includes(term) ||
                p.description.toLowerCase().includes(term) ||
                (PERMISSION_MODULE_LABELS[group.module] ?? group.module).toLowerCase().includes(term),
            )
          : group.permissions,
      }))
      .filter((group) => group.permissions.length > 0)
  }, [groups.data, search])

  const save = useMutation<RoleRow, ApiError, void>({
    mutationFn: () =>
      role === null
        ? request<RoleRow>('/api/proxy/roles', {
            method: 'POST',
            body: {
              code: code.trim().toUpperCase(),
              name: name.trim(),
              description: description.trim() || null,
              permissions: [...current],
            },
          })
        : request<RoleRow>(`/api/proxy/roles/${role.id}`, {
            method: 'PUT',
            body: {
              name: name.trim(),
              description: description.trim() || null,
              permissions: [...current],
            },
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] })
      void queryClient.invalidateQueries({ queryKey: ['role'] })
      onClose()
    },
  })

  const canSave = name.trim().length > 0 && (role !== null || /^[A-Z][A-Z0-9_]*$/.test(code.trim().toUpperCase()))

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={role === null ? 'New role' : role.name}
      subtitle={role === null ? 'Define what this role may do' : role.code}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly ? (
            <Button
              variant="primary"
              disabled={!canSave}
              loading={save.isPending}
              onClick={() => save.mutate()}
            >
              {role === null ? 'Create role' : 'Save changes'}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {isOwnRole ? (
          <Alert tone="warning" title="This is the role you are signed in under">
            It is read-only here. Another administrator must make the change, so a mistake cannot lock
            you out of correcting it.
          </Alert>
        ) : null}

        {save.error ? <OperationError error={save.error} onRetry={() => save.reset()} /> : null}

        {role === null ? (
          <Field
            label="Code"
            required
            description="Uppercase, no spaces. Permanent once created."
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GATE_CLERK"
              className="font-mono"
            />
          </Field>
        ) : null}

        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
        </Field>

        <Field label="Description" description="What this role is for, in one line.">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={readOnly}
          />
        </Field>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-h3 text-graphite-800">Permissions</h3>
            <span className="text-caption text-graphite-500">{current.size} selected</span>
          </div>

          <SearchInput
            value={search}
            onDebouncedChange={setSearch}
            placeholder="Search permissions…"
            ariaLabel="Search permissions"
          />

          {groups.isLoading ? (
            <p className="text-body-sm text-graphite-500">Loading permissions…</p>
          ) : visibleGroups.length === 0 ? (
            <p className="rounded-md border border-graphite-200 p-4 text-body-sm text-graphite-500">
              No permission matches &ldquo;{search}&rdquo;.
            </p>
          ) : (
            visibleGroups.map((group) => (
              <fieldset key={group.module} className="rounded-md border border-graphite-200 p-3">
                <legend className="px-1 text-overline uppercase text-graphite-500">
                  {PERMISSION_MODULE_LABELS[group.module] ?? group.module}
                </legend>
                <ul className="flex flex-col gap-1.5">
                  {group.permissions.map((permission) => {
                    const grantable = can(permission.code as never)
                    return (
                      <li key={permission.code}>
                        <Checkbox
                          checked={current.has(permission.code)}
                          disabled={readOnly || !grantable}
                          onCheckedChange={(on) => toggle(permission.code, on === true)}
                          label={permission.description}
                          description={
                            <span className="font-mono">
                              {permission.code}
                              {!grantable ? ' · you do not hold this' : ''}
                            </span>
                          }
                        />
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            ))
          )}
        </div>
      </div>
    </Drawer>
  )
}
