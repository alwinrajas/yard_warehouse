'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { request } from '@/lib/api/client'

export function ConsoleShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      await request('/api/auth/logout', { method: 'POST' })
    } catch {
      /* the handler clears the cookie regardless; fall through to the redirect */
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <AppShell
      onSignOut={signOut}
      signingOut={signingOut}
    >
      {children}
    </AppShell>
  )
}
