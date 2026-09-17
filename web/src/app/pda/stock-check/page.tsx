import type { Metadata } from 'next'

import { PdaStockCheck } from './pda-stock-check'

export const metadata: Metadata = { title: 'Stock Check · PDA' }

export default function Page() {
  return <PdaStockCheck />
}
