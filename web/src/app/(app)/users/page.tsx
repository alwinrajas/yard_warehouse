import type { Metadata } from 'next'
import { Suspense } from 'react'

import { UsersScreen } from './users-screen'

export const metadata: Metadata = { title: 'Users' }

export default function Page() {
  return (
    <Suspense>
      <UsersScreen />
    </Suspense>
  )
}
