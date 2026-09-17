import type { Metadata } from 'next'
import { Suspense } from 'react'

import { MovementScreen } from './movement-screen'

export const metadata: Metadata = { title: 'Movement' }

export default function Page() {
  return (
    <Suspense>
      <MovementScreen />
    </Suspense>
  )
}
