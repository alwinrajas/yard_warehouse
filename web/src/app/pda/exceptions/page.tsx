import type { Metadata } from 'next'

import { PdaExceptions } from './pda-exceptions'

export const metadata: Metadata = { title: 'Exception · PDA' }

export default function Page() {
  return <PdaExceptions />
}
