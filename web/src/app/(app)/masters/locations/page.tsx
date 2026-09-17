import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LocationsScreen } from './locations-screen'

export const metadata: Metadata = { title: 'Locations' }

export default function Page() {
  return (
    <Suspense>
      <LocationsScreen />
    </Suspense>
  )
}
