import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AuditScreen } from './audit-screen'

export const metadata: Metadata = { title: 'Audit' }

export default function Page() {
  return (
    <Suspense>
      <AuditScreen />
    </Suspense>
  )
}
