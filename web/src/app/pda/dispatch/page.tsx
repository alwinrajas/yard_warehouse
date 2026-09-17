import type { Metadata } from 'next'

import { PdaDispatch } from './pda-dispatch'

export const metadata: Metadata = { title: 'Dispatch · PDA' }

export default function PdaDispatchPage() {
  return <PdaDispatch />
}
