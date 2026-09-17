import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CorrectionsScreen } from './corrections-screen'

export const metadata: Metadata = { title: 'Corrections' }

export default function Page() {
  return (
    <Suspense>
      <CorrectionsScreen />
    </Suspense>
  )
}
