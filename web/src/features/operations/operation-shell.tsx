'use client'

import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Panel, ProgressSteps } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * Shared frame for the three web transaction screens.
 *
 * A transaction screen is a sequence, not a form, so the step rail sits at the
 * top of the working surface rather than floating above it — the operator reads
 * "where am I" and "what do I do" in one glance.
 *
 * The standing notice is deliberate: a keyed transaction is the path by which
 * scan verification quietly becomes optional, so the screen says so every time
 * (docs/20 §2). It is quiet rather than alarming, because manual entry is
 * permitted — it just has to be visible.
 */
export function OperationShell({
  title,
  context,
  breadcrumb,
  steps,
  current,
  icon,
  aside,
  children,
}: {
  title: string
  context: string
  breadcrumb: string
  steps: { id: string; label: string }[]
  current: number
  icon?: ReactNode
  /** Optional context column — the pallet or location already resolved. */
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-5', aside ? 'max-w-6xl' : 'max-w-3xl')}>
      <PageHeader
        icon={icon}
        title={title}
        context={context}
        breadcrumbs={[{ label: 'Transactions' }, { label: breadcrumb }]}
        meta={
          <span className="inline-flex items-center gap-1.5 text-caption text-graphite-500">
            <Info className="size-3.5" aria-hidden />
            Manual entry — recorded as web channel, no scan verification
          </span>
        }
      />

      <div className={cn('grid gap-4', aside && 'lg:grid-cols-[1fr_20rem]')}>
        <Panel padded={false} className="overflow-hidden shadow-card">
          <div className="border-b border-graphite-200 bg-surface-sunken px-5 py-3.5">
            <ProgressSteps steps={steps} current={current} />
          </div>
          <div className="p-5">{children}</div>
        </Panel>

        {aside ? <div className="flex flex-col gap-4">{aside}</div> : null}
      </div>
    </div>
  )
}
