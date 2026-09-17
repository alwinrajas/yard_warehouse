import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LocationDetailScreen } from './location-detail-screen'

export const metadata: Metadata = { title: 'Location' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense>
      <LocationDetailScreen id={id} />
    </Suspense>
  )
}
