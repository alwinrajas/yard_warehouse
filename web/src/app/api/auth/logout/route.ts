import { NextResponse } from 'next/server'

import { apiFetch, isApiConfigured } from '@/lib/api/server'
import { clearSession, getToken } from '@/lib/auth/session.server'

/**
 * Logout always clears the local session, even if the server call fails —
 * a user who clicked "sign out" must end up signed out on this device
 * regardless of network state.
 */
export async function POST() {
  const token = await getToken()

  if (token && isApiConfigured()) {
    try {
      await apiFetch<unknown>('/auth/logout', { method: 'POST', token })
    } catch {
      /* server-side revocation failed; local session is cleared below regardless */
    }
  }

  await clearSession()
  return NextResponse.json({ success: true, data: { signedOut: true } })
}
