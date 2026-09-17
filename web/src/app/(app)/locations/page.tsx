import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LocationDirectory } from './location-directory'

export const metadata: Metadata = { title: 'Locations' }

export default function Page() {
  return (
    <Suspense>
      <LocationDirectory />
    </Suspense>
  )
}
