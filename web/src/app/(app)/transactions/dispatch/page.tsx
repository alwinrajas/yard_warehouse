import type { Metadata } from 'next'
import { Suspense } from 'react'

import { DispatchScreen } from './dispatch-screen'

export const metadata: Metadata = { title: 'Dispatch' }

export default function Page() {
  return (
    <Suspense>
      <DispatchScreen />
    </Suspense>
  )
}
