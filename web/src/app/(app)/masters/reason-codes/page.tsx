import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ReasonCodesScreen } from './reason-codes-screen'

export const metadata: Metadata = { title: 'Reason Codes' }

export default function Page() {
  return (
    <Suspense>
      <ReasonCodesScreen />
    </Suspense>
  )
}
