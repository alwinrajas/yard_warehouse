import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LocationImportScreen } from './import-screen'

export const metadata: Metadata = { title: 'Import locations' }

export default function Page() {
  return (
    <Suspense>
      <LocationImportScreen />
    </Suspense>
  )
}
