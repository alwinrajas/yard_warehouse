import type { Metadata } from 'next'
import { Suspense } from 'react'

import { VerificationScreen } from './verification-screen'

export const metadata: Metadata = { title: 'Stock Verification' }

export default function Page() {
  return (
    <Suspense>
      <VerificationScreen />
    </Suspense>
  )
}
