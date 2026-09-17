'use client'

import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, Panel, ProgressSteps } from '@/components/ui'

/**
 * Shared frame for the three web transaction screens.
 *
 * The standing notice is deliberate: a keyed transaction is the path by which
 * scan verification quietly becomes optional, so the screen says so every time
 * (docs/20 §2).
 */
export function OperationShell({
  title,
  context,
  breadcrumb,
  steps,
  current,
  children,
}: {
  title: string
  context: string
  breadcrumb: string
  steps: { id: string; label: string }[]
  current: number
  children: ReactNode
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={title}
        context={context}
        breadcrumbs={[{ label: 'Transactions' }, { label: breadcrumb }]}
      />

      <Alert tone="info" title="Manual entry — no scan verification">
        Use the ALU TRACK PDA where possible. This transaction is recorded as web-channel without a
        device reference, so it is distinguishable in the audit trail.
      </Alert>

      <ProgressSteps steps={steps} current={current} />

      <Panel>{children}</Panel>
    </div>
  )
}
