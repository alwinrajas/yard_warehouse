import 'server-only'

import { cookies } from 'next/headers'

import { apiFetch, isApiConfigured } from '@/lib/api/server'
import type { LoginResponse, SessionUser } from '@/lib/api/types'
import type { Permission, RoleCode } from '@/lib/permissions/permission-codes'
import type { Session } from '@/lib/permissions/session'

/**
 * Session storage — the BFF half of docs/02 §5.2.
 *
 * The bearer token lives in an httpOnly, Secure, SameSite=Strict cookie that
 * JavaScript cannot read. The session summary is kept in a second cookie so the
 * server layout can render the shell without a round trip per navigation; it
 * carries no secret and is re-validated against /auth/me on a cadence.
 */
export const TOKEN_COOKIE = 'alutrack_token'
export const SESSION_COOKIE = 'alutrack_session'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
} as const

export function toSession(user: SessionUser): Session {
  return {
    userId: user.user_id,
    name: user.name,
    username: user.username,
    role: user.role as RoleCode,
    roleLabel: user.role_label,
    siteId: user.site_id,
    siteName: user.site_name,
    facilities: user.facilities,
    permissions: user.permissions as Permission[],
  }
}

export async function persistSession(
  login: LoginResponse,
  channel: 'WEB' | 'PDA' = 'WEB',
): Promise<Session> {
  const jar = await cookies()
  const maxAge = Math.max(
    60,
    Math.floor((new Date(login.expires_at).getTime() - Date.now()) / 1000),
  )
  const session = { ...toSession(login.user), channel }

  jar.set(TOKEN_COOKIE, login.token, { ...COOKIE_OPTIONS, maxAge })
  jar.set(SESSION_COOKIE, JSON.stringify({ ...session, mustChangePassword: login.user.must_change_password }), {
    ...COOKIE_OPTIONS,
    maxAge,
  })

  return session
}

export async function clearSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(TOKEN_COOKIE)
  jar.delete(SESSION_COOKIE)
}

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value
}

export type StoredSession = Session & { mustChangePassword?: boolean }

/** Reads the cached session summary. Returns null when unauthenticated. */
export async function getSession(): Promise<StoredSession | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

/**
 * Re-validates against the server. Used where staleness matters (a permission
 * may have been revoked); the cached summary is fine for ordinary rendering.
 */
export async function refreshSession(): Promise<Session | null> {
  if (!isApiConfigured()) return getSession()
  const token = await getToken()
  if (!token) return null
  try {
    const user = await apiFetch<SessionUser>('/auth/me', { token })
    return toSession(user)
  } catch {
    return null
  }
}
