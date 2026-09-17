import type { Metadata } from 'next'

import { PdaPutAway } from './pda-put-away'

export const metadata: Metadata = { title: 'Put-Away · PDA' }

export default function PdaPutAwayPage() {
  return <PdaPutAway />
}
