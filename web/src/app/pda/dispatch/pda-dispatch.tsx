'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

import { PdaButton, PdaError, PdaResult, PdaScan, PdaStep, PdaValue } from '../pda-ui'
import { PdaGuard } from '../pda-guard'
import { rememberReceipt, receiptFrom } from '@/features/pda/last-result'
import { usePalletScan } from '@/features/operations/use-scan'
import { newIdempotencyKey } from '@/features/shared/idempotency'
import { requestDetailed } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import type { PalletDetail, TransactionRow } from '@/lib/api/inventory-types'
import { formatTime } from '@/lib/format'

type Result = { transaction: TransactionRow; pallet: PalletDetail }

/**
 * P-04 Dispatch (docs/24 §4).
 *
 * Dispatch removes a pallet from live inventory and cannot be undone from the
 * PDA — a mistake is corrected by a supervisor on the web console (FR-030), so
 * the confirmation screen says exactly that rather than implying an undo.
 */
export function PdaDispatch() {
  const queryClient = useQueryClient()
  const pallet = usePalletScan(false)
  const [reference, setReference] = useState('')
  const [key, setKey] = useState(newIdempotencyKey)
  const [result, setResult] = useState<Result | null>(null)
  const [replayed, setReplayed] = useState(false)

  const commit = useMutation<{ data: Result; replayed: boolean }, ApiError, void>({
    mutationFn: () =>
      requestDetailed<Result>('/api/proxy/dispatch', {
        method: 'POST',
        body: {
          pallet_barcode: pallet.pallet!.raw_barcode_value,
          location_barcode: pallet.pallet!.location?.code ?? null,
          delivery_reference: reference.trim() || null,
        },
        headers: { 'Idempotency-Key': key },
      }),
    onSuccess: ({ data, replayed: wasReplayed }) => {
      setResult(data)
      setReplayed(wasReplayed)
      rememberReceipt(
        receiptFrom('Pallet dispatched', data.transaction, [
          { label: 'Pallet', value: data.pallet.pallet_number ?? '—' },
          { label: 'Delivery', value: reference.trim() || '—' },
        ]),
      )
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  function reset() {
    setResult(null)
    setReplayed(false)
    setReference('')
    setKey(newIdempotencyKey())
    commit.reset()
    pallet.reset()
  }

  if (result) {
    return (
      <PdaResult
        ok
        replayed={replayed}
        title="Dispatched"
        reference={result.transaction.txn_ref}
        details={[
          { label: 'Pallet', value: result.pallet.pallet_number ?? '—' },
          { label: 'Delivery', value: reference.trim() || '—' },
          { label: 'Time', value: formatTime(result.transaction.created_at) },
        ]}
        actions={
          <>
            <PdaButton onClick={reset}>Dispatch another</PdaButton>
            <Link
              href="/pda"
              className="flex min-h-16 items-center justify-center rounded-lg border border-graphite-700 text-body uppercase text-graphite-300"
            >
              Done
            </Link>
          </>
        }
      />
    )
  }

  if (commit.error ?? pallet.error) {
    return (
      <PdaError
        error={(commit.error ?? pallet.error)!}
        onRetry={() => {
          commit.reset()
          if (pallet.error) pallet.reset()
        }}
      />
    )
  }

  return (
    <PdaGuard permission="dispatch.perform" action="dispatch pallets">
      {!pallet.pallet ? (
        <>
          <PdaStep step={1} total={2} label="Scan pallet" />
          <PdaScan prompt="Scan the pallet label" onScan={pallet.scan} busy={pallet.isScanning} />
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <PdaStep step={2} total={2} label="Confirm dispatch" />
          <PdaValue
            label="Pallet"
            value={pallet.pallet.pallet_number ?? pallet.pallet.raw_barcode_value}
            sub={pallet.pallet.job_number ?? undefined}
          />
          <PdaValue label="Leaving" value={pallet.pallet.location?.code ?? '—'} />

          <label className="flex flex-col gap-1.5">
            <span className="text-caption uppercase tracking-wide text-graphite-400">
              Delivery reference (optional)
            </span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              autoCapitalize="characters"
              className="min-h-16 rounded-md border border-graphite-700 bg-graphite-950 px-3 font-mono text-mono-lg text-graphite-0 outline-none focus:border-anodic-400"
            />
          </label>

          <p className="rounded-md border border-signal-dark-warning-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-warning-fg">
            Dispatch removes this pallet from live inventory. It cannot be reversed from the PDA — a
            supervisor must record a correction on the console.
          </p>

          <PdaButton tone="danger" onClick={() => commit.mutate()} busy={commit.isPending}>
            Confirm dispatch
          </PdaButton>
          <PdaButton tone="ghost" onClick={() => pallet.reset()} disabled={commit.isPending}>
            Rescan pallet
          </PdaButton>
        </div>
      )}
    </PdaGuard>
  )
}
