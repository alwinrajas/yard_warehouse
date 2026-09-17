import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getSession } from '@/lib/auth/session.server'

import { Providers } from '../providers'
import { PdaShell } from './pda-shell'

export const metadata: Metadata = { title: 'ALU TRACK PDA' }

/**
 * The PDA surface.
 *
 * A separate interaction model, not a responsive desktop: dark, scan-first,
 * one decision per screen, 64dp+ targets (docs/24). The operator is gloved, in a
 * forklift, possibly in direct sunlight.
 */
export default async function PdaLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?next=/pda')

  // The ledger records the channel from the token, so a console session working
  // the handheld screens would file scans as WEB. Signing in again is a few
  // seconds; a permanently wrong audit trail is not recoverable.
  if (session.channel !== 'PDA') redirect('/login?next=/pda')

  return (
    <Providers session={session}>
      <PdaShell>{children}</PdaShell>
    </Providers>
  )
}
