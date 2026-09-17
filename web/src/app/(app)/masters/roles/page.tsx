import type { Metadata } from 'next'
import { Suspense } from 'react'

import { RolesScreen } from './roles-screen'

export const metadata: Metadata = { title: 'Roles & Permissions' }

export default function Page() {
  return (
    <Suspense>
      <RolesScreen />
    </Suspense>
  )
}
