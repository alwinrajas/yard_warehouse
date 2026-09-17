import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ZonesScreen } from './zones-screen'

export const metadata: Metadata = { title: 'Zones' }

export default function Page() {
  return (
    <Suspense>
      <ZonesScreen />
    </Suspense>
  )
}
