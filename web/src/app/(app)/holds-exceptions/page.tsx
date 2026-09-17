import type { Metadata } from 'next'
import { Suspense } from 'react'

import { HoldsScreen } from './holds-screen'

export const metadata: Metadata = { title: 'Holds & Exceptions' }

export default function Page() {
  return (
    <Suspense>
      <HoldsScreen />
    </Suspense>
  )
}
