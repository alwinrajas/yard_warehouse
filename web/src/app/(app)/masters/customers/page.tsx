import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CustomersScreen } from './customers-screen'

export const metadata: Metadata = { title: 'Customers' }

export default function Page() {
  return (
    <Suspense>
      <CustomersScreen />
    </Suspense>
  )
}
