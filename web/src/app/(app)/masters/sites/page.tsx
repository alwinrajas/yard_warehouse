import type { Metadata } from 'next'
import { Suspense } from 'react'

import { SitesScreen } from './sites-screen'

export const metadata: Metadata = { title: 'Sites' }

export default function SitesPage() {
  return (
    <Suspense>
      <SitesScreen />
    </Suspense>
  )
}
