import type { Metadata } from 'next'
import { Suspense } from 'react'

import { BarcodesScreen } from './barcodes-screen'

export const metadata: Metadata = { title: 'Location Barcodes' }

export default function Page() {
  return (
    <Suspense>
      <BarcodesScreen />
    </Suspense>
  )
}
