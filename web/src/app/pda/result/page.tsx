import type { Metadata } from 'next'

import { PdaLastResult } from './pda-last-result'

export const metadata: Metadata = { title: 'Result · PDA' }

export default function Page() {
  return <PdaLastResult />
}
