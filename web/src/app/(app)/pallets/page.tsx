import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PalletsScreen } from './pallets-screen'

export const metadata: Metadata = { title: 'Pallets' }

export default function Page() {
  return (
    <Suspense>
      <PalletsScreen />
    </Suspense>
  )
}
