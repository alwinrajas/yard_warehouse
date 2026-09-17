import type { Metadata } from 'next'
import { Suspense } from 'react'

import { OpeningStockScreen } from './opening-stock-screen'

export const metadata: Metadata = { title: 'Opening Stock' }

export default function Page() {
  return (
    <Suspense>
      <OpeningStockScreen />
    </Suspense>
  )
}
