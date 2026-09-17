'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { PdaGuard } from '../pda-guard'
import { PdaStep } from '../pda-ui'
import { requestPage } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import type { TransactionRow } from '@/lib/api/inventory-types'
import type { Paginated } from '@/lib/api/types'
import { useSession } from '@/lib/permissions/session'
import { formatTime } from '@/lib/format'

const TYPE_LABEL: Record<string, string> = {
  PUTAWAY: 'Put away',
  MOVEMENT: 'Moved',
  DISPATCH: 'Dispatched',
  STAGE: 'Staged',
  HOLD: 'Held',
  HOLD_RELEASE: 'Hold released',
  CORRECTION: 'Correction',
}

/**
 * P-10 Recent activity (docs/24 §4).
 *
 * An operator's own shift, so they can confirm a transaction landed after a
 * dropped connection. The API scopes a PDA operator to their own rows; the
 * user_id filter here is a convenience, not the control.
 */
export function PdaRecentActivity() {
  const session = useSession()

  const { data, isLoading, error } = useQuery<Paginated<TransactionRow>, ApiError>({
    queryKey: ['pda-activity', session?.userId],
    queryFn: () =>
      requestPage<TransactionRow>(
        `/api/proxy/transactions?pageSize=50${session?.userId ? `&user_id=${session.userId}` : ''}`,
      ),
    staleTime: 0,
  })

  return (
    <PdaGuard permission="transaction.view" action="view transaction history">
      <PdaStep step={1} total={1} label="Your recent activity" />

      {isLoading ? (
        <p className="p-3 text-body-sm text-graphite-400">Loading…</p>
      ) : error ? (
        <p className="rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
          {error.message}
        </p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="rounded-lg border border-graphite-800 bg-graphite-900 p-6 text-center text-body text-graphite-400">
          Nothing recorded yet this session.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data?.items.map((txn) => (
            <li key={txn.id} className="rounded-lg border border-graphite-800 bg-graphite-900 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-body font-medium text-graphite-0">
                  {TYPE_LABEL[txn.type] ?? txn.type}
                </span>
                <span className="text-caption text-graphite-400">{formatTime(txn.created_at)}</span>
              </div>
              <p className="font-mono text-mono text-graphite-300">{txn.pallet_number ?? '—'}</p>
              <p className="text-caption text-graphite-400">
                {[txn.source_location_code, txn.destination_location_code].filter(Boolean).join(' → ') || '—'}
              </p>
              <p className="font-mono text-caption text-graphite-400">{txn.txn_ref}</p>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/pda"
        className="mt-4 flex min-h-16 items-center justify-center rounded-lg border border-graphite-700 text-body uppercase text-graphite-300"
      >
        Back to home
      </Link>
    </PdaGuard>
  )
}
