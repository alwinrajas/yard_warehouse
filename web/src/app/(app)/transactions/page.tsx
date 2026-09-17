import type { Metadata } from 'next'
import { Suspense } from 'react'

import { TransactionsScreen } from './transactions-screen'

export const metadata: Metadata = { title: 'Transactions' }

export default function Page() {
  return (
    <Suspense>
      <TransactionsScreen />
    </Suspense>
  )
}
