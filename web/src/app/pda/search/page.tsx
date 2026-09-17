import type { Metadata } from 'next'

import { PdaSearch } from './pda-search'

export const metadata: Metadata = { title: 'Search · PDA' }

export default function Page() {
  return <PdaSearch />
}
