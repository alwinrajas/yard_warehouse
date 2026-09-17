import type { Metadata } from 'next'
import { Suspense } from 'react'

import { InventoryScreen } from './inventory-screen'

export const metadata: Metadata = { title: 'Live Inventory' }

export default function Page() {
  return (
    <Suspense>
      <InventoryScreen />
    </Suspense>
  )
}
