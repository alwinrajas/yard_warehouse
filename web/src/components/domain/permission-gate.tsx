'use client'

import type { ReactNode } from 'react'

import type { Permission } from '@/lib/permissions/permission-codes'
import { usePermissions } from '@/lib/permissions/session'

/**
 * PermissionGate.
 *
 * Renders children only when the permission is held. This decides *rendering*,
 * never authorisation — every guarded operation is independently enforced
 * server-side (docs/07).
 *
 * Note the distinction in docs/22 §6: an action the user can never perform is
 * absent, not disabled. A disabled control the user cannot enable is a dead
 * button that invites a support call. Actions blocked by *state* are a different
 * case and do render disabled, with a tooltip giving the reason.
 */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: {
  permission?: Permission
  anyOf?: Permission[]
  allOf?: Permission[]
  fallback?: ReactNode
  children: ReactNode
}) {
  const { can, canAny, canAll } = usePermissions()

  let allowed = true
  if (permission) allowed = can(permission)
  if (allowed && anyOf?.length) allowed = canAny(anyOf)
  if (allowed && allOf?.length) allowed = canAll(allOf)

  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}
