import type { Metadata } from 'next'

import { PdaMovement } from './pda-movement'

export const metadata: Metadata = { title: 'Move · PDA' }

export default function PdaMovementPage() {
  return <PdaMovement />
}
