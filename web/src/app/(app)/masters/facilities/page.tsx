import type { Metadata } from 'next'
import { Suspense } from 'react'

import { FacilitiesScreen } from './facilities-screen'

export const metadata: Metadata = { title: 'Facilities' }

export default function Page() {
  return (
    <Suspense>
      <FacilitiesScreen />
    </Suspense>
  )
}
