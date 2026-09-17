import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getSession } from '@/lib/auth/session.server'

import { Providers } from '../providers'
import { ConsoleShell } from './console-shell'

/**
 * Authenticated console layout.
 *
 * The session is resolved server-side and handed to the client providers, so the
 * shell renders with the correct permissions on first paint — no flash of
 * navigation the user is not allowed to see.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  // A PDA session stamps `channel: PDA` on everything it records. Letting it
  // drive the console would put console work in the ledger under the handheld
  // channel, so it is sent back to the surface it was opened for.
  if (session.channel === 'PDA') redirect('/pda')

  return (
    <Providers session={session}>
      <ConsoleShell>{children}</ConsoleShell>
    </Providers>
  )
}
