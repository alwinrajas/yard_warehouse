'use client'

import { PageHeader } from '@/components/layout/page-header'
import { Badge, EmptyState, Panel, Skeleton } from '@/components/ui'
import { useApi } from '@/features/shared/use-api'
import type { ReasonCode } from '@/lib/api/types'

const CATEGORY_LABELS: Record<string, string> = {
  TRANSFER: 'Transfer',
  DISPATCH_CANCEL: 'Dispatch cancellation',
  CORRECTION: 'Correction',
  HOLD: 'Hold',
  DAMAGE: 'Damage',
  LOCATION_BLOCK: 'Location block',
  OTHER: 'Other',
}

/**
 * W-26 Reason Codes (docs/23 §10).
 *
 * Read-only in this increment: the API exposes the list, and full CRUD lands
 * with the administration increment. The screen is honest about that rather
 * than showing controls that do nothing.
 */
export function ReasonCodesScreen() {
  const { data, isLoading, error } = useApi<ReasonCode[]>(['reason-codes'], '/api/proxy/reason-codes')

  const grouped = (data ?? []).reduce<Record<string, ReasonCode[]>>((acc, code) => {
    const bucket = (acc[code.category] ??= [])
    bucket.push(code)
    return acc
  }, {})

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Reason Codes"
        context="The controlled vocabulary behind every hold, block and correction"
        breadcrumbs={[{ label: 'Masters' }, { label: 'Reason Codes' }]}
      />

      {isLoading ? (
        <Panel>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-20 w-full" />
        </Panel>
      ) : error ? (
        <Panel padded={false}>
          <EmptyState variant="error" title="Could not load reason codes" description={error.message} />
        </Panel>
      ) : (data ?? []).length === 0 ? (
        <Panel padded={false}>
          <EmptyState variant="no-data" title="No reason codes configured" />
        </Panel>
      ) : (
        Object.entries(grouped).map(([category, codes]) => (
          <Panel key={category}>
            <h2 className="text-h3 text-graphite-800">{CATEGORY_LABELS[category] ?? category}</h2>
            <ul className="mt-3 divide-y divide-graphite-200">
              {codes.map((code) => (
                <li key={code.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <span className="block text-body-sm text-graphite-800">{code.name}</span>
                    <span className="block font-mono text-caption text-graphite-500">{code.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {code.requires_remarks ? <Badge tone="info">Remarks required</Badge> : null}
                    <Badge tone={code.is_active ? 'neutral' : 'outline'}>
                      {code.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}
    </div>
  )
}
