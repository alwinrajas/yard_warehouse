import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PutAwayScreen } from './put-away-screen'

export const metadata: Metadata = { title: 'Put-Away' }

export default function Page() {
  return (
    <Suspense>
      <PutAwayScreen />
    </Suspense>
  )
}
