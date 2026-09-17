import type { Metadata } from 'next'
import { Suspense } from 'react'

import { SettingsScreen } from './settings-screen'

export const metadata: Metadata = { title: 'System Settings' }

export default function Page() {
  return (
    <Suspense>
      <SettingsScreen />
    </Suspense>
  )
}
