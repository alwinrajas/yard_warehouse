import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PalletDetailScreen } from './pallet-detail-screen'

export const metadata: Metadata = { title: 'Pallet' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense>
      <PalletDetailScreen id={id} />
    </Suspense>
  )
}
