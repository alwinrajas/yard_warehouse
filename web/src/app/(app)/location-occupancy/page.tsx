import type { Metadata } from 'next'
import { Suspense } from 'react'

import { OccupancyScreen } from './occupancy-screen'

export const metadata: Metadata = { title: 'Location Occupancy' }

export default function Page() {
  return (
    <Suspense>
      <OccupancyScreen />
    </Suspense>
  )
}
