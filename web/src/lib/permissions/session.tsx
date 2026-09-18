'use client'

/**
 * Session and permission context.
 *
 * The client uses the permission set ONLY to decide what to render. Every guarded
 * operation is independently enforced server-side (docs/07-permission-matrix.md).
 * Nothing here is a security boundary — it exists so users are not shown controls
 * they cannot use.
 *
 * The session is hydrated by the server layout from `GET /auth/me`. In U-0 the
 * provider is wired but no API exists yet, so the shell is rendered from a session
 * supplied by the caller. No session is fabricated inside application code.
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

import { setAppTimezone } from '@/lib/app-config'

import type { Permission, RoleCode } from './permission-codes'

export type FacilityScope = {
  id: string
  code: string
  name: string
}

export type Session = {
  userId: string
  name: string
  username: string
  role: RoleCode
  roleLabel: string
  siteId: string | null
  siteName: string | null
  facilities: FacilityScope[]
  permissions: Permission[]
  /** The surface this session was opened for; stamped on its transactions. */
  channel?: 'WEB' | 'PDA'
  /** When the BFF issued this session. Drives PDA shift-elapsed (docs/08 §2). */
  signedInAt?: string
  /** CFG-13 — the business timezone, as the server computes "today" in. */
  appTimezone?: string
}

type SessionContextValue = {
  session: Session | null
  can: (permission: Permission) => boolean
  canAny: (permissions: Permission[]) => boolean
  canAll: (permissions: Permission[]) => boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({
  session,
  children,
}: {
  session: Session | null
  children: ReactNode
}) {
  // Adopt CFG-13 before anything renders, so the first paint already formats in
  // the yard's timezone rather than flashing UTC and correcting itself. Set
  // during render on purpose: an effect would run after the children have
  // already formatted their dates.
  setAppTimezone(session?.appTimezone)

  const granted = useMemo(() => new Set<string>(session?.permissions ?? []), [session])

  const can = useCallback((permission: Permission) => granted.has(permission), [granted])

  const canAny = useCallback(
    (permissions: Permission[]) => permissions.some((p) => granted.has(p)),
    [granted],
  )

  const canAll = useCallback(
    (permissions: Permission[]) => permissions.every((p) => granted.has(p)),
    [granted],
  )

  const value = useMemo<SessionContextValue>(
    () => ({ session, can, canAny, canAll }),
    [session, can, canAny, canAll],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>')
  }
  return ctx
}

/** The signed-in user, or null when unauthenticated. */
export function useSession(): Session | null {
  return useSessionContext().session
}

/**
 * Permission check helper.
 *
 *   const can = usePermission()
 *   {can('transfer.perform') && <Button>Transfer</Button>}
 */
export function usePermission(): SessionContextValue['can'] {
  return useSessionContext().can
}

export function usePermissions(): Omit<SessionContextValue, 'session'> {
  const { can, canAny, canAll } = useSessionContext()
  return { can, canAny, canAll }
}
