'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

import { PdaButton, PdaError, PdaResult, PdaScan, PdaStep, PdaValue } from '../pda-ui'
import { PdaGuard } from '../pda-guard'
import { rememberReceipt, receiptFrom } from '@/features/pda/last-result'
import { useLocationScan, usePalletScan } from '@/features/operations/use-scan'
import { newIdempotencyKey } from '@/features/shared/idempotency'
import { requestDetailed } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import { statusKeyOf, type PalletDetail, type TransactionRow } from '@/lib/api/inventory-types'
import { formatTime } from '@/lib/format'
import { statusLabel } from '@/lib/status'

type Result = {
  transaction: TransactionRow
  pallet: PalletDetail
  from: { code: string }
  to: { code: string }
}

/**
 * P-03 Movement (docs/24 §4).
 *
 * Pallet first: the system already knows where it is, so the source is shown
 * rather than asked for. The destination is the only thing the operator decides.
 */
export function PdaMovement() {
  const queryClient = useQueryClient()
  const pallet = usePalletScan(false)
  const destination = useLocationScan()
  const [key, setKey] = useState(newIdempotencyKey)
  const [result, setResult] = useState<Result | null>(null)
  const [replayed, setReplayed] = useState(false)

  const commit = useMutation<{ data: Result; replayed: boolean }, ApiError, void>({
    mutationFn: () =>
      requestDetailed<Result>('/api/proxy/movements', {
        method: 'POST',
        body: {
          pallet_barcode: pallet.pallet!.raw_barcode_value,
          source_barcode: pallet.pallet!.location?.code ?? null,
          destination_barcode: destination.location!.code,
        },
        headers: { 'Idempotency-Key': key },
      }),
    onSuccess: ({ data, replayed: wasReplayed }) => {
      setResult(data)
      setReplayed(wasReplayed)
      rememberReceipt(
        receiptFrom('Pallet moved', data.transaction, [
          { label: 'Pallet', value: data.pallet.pallet_number ?? '—' },
          { label: 'From', value: data.from.code },
          { label: 'To', value: data.to.code },
        ]),
      )
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  function reset() {
    setResult(null)
    setReplayed(false)
    setKey(newIdempotencyKey())
    commit.reset()
    pallet.reset()
    destination.reset()
  }

  if (result) {
    return (
      <PdaResult
        ok
        replayed={replayed}
        title="Moved"
        reference={result.transaction.txn_ref}
        details={[
          { label: 'Pallet', value: result.pallet.pallet_number ?? '—' },
          { label: 'From', value: result.from.code },
          { label: 'To', value: result.to.code },
          { label: 'Time', value: formatTime(result.transaction.created_at) },
        ]}
        actions={
          <>
            <PdaButton onClick={reset}>Move another</PdaButton>
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

  const error = commit.error ?? pallet.error ?? destination.error
  if (error) {
    return (
      <PdaError
        error={error}
        onRetry={() => {
          commit.reset()
          if (pallet.error) pallet.reset()
          if (destination.error) destination.reset()
        }}
      />
    )
  }

  return (
    <PdaGuard permission="transfer.perform" action="move pallets">
      {!pallet.pallet ? (
        <>
          <PdaStep step={1} total={3} label="Scan pallet" />
          <PdaScan prompt="Scan the pallet label" onScan={pallet.scan} busy={pallet.isScanning} />
        </>
      ) : !destination.location ? (
        <div className="flex flex-col gap-3">
          <PdaStep step={2} total={3} label="Scan destination" />
          <PdaValue
            label="Pallet"
            value={pallet.pallet.pallet_number ?? pallet.pallet.raw_barcode_value}
            sub={statusLabel(statusKeyOf(pallet.pallet.display_status))}
          />
          <PdaValue label="Currently at" value={pallet.pallet.location?.code ?? 'Not in inventory'} />
          <PdaScan prompt="Scan the destination location" onScan={destination.scan} busy={destination.isScanning} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <PdaStep step={3} total={3} label="Confirm move" />
          <PdaValue label="Pallet" value={pallet.pallet.pallet_number ?? pallet.pallet.raw_barcode_value} />
          <PdaValue label="From" value={pallet.pallet.location?.code ?? '—'} />
          <PdaValue label="To" value={destination.location.code} />
          <PdaButton onClick={() => commit.mutate()} busy={commit.isPending}>
            Confirm move
          </PdaButton>
          <PdaButton tone="ghost" onClick={() => destination.reset()} disabled={commit.isPending}>
            Rescan destination
          </PdaButton>
        </div>
      )}
    </PdaGuard>
  )
}
