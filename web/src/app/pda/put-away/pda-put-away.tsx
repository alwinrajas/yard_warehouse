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
import type { PalletDetail, TransactionRow } from '@/lib/api/inventory-types'
import { formatTime } from '@/lib/format'

type Result = { transaction: TransactionRow; pallet: PalletDetail; location: { code: string } }

/**
 * P-02 Put-Away (docs/24 §4).
 *
 * Location first, then pallet — a blocked lane is rejected before the operator
 * lifts anything. Both scans are advisory; the commit re-validates under the
 * pallet lock.
 */
export function PdaPutAway() {
  const queryClient = useQueryClient()
  const location = useLocationScan()
  const pallet = usePalletScan(true)
  const [key, setKey] = useState(newIdempotencyKey)
  const [result, setResult] = useState<Result | null>(null)
  const [replayed, setReplayed] = useState(false)

  const commit = useMutation<{ data: Result; replayed: boolean }, ApiError, void>({
    mutationFn: () =>
      requestDetailed<Result>('/api/proxy/putaway', {
        method: 'POST',
        body: {
          location_barcode: location.location!.code,
          pallet_barcode: pallet.pallet!.raw_barcode_value,
        },
        headers: { 'Idempotency-Key': key },
      }),
    onSuccess: ({ data, replayed: wasReplayed }) => {
      setResult(data)
      setReplayed(wasReplayed)
      rememberReceipt(
        receiptFrom('Pallet stored', data.transaction, [
          { label: 'Pallet', value: data.pallet.pallet_number ?? '—' },
          { label: 'Location', value: data.location.code },
        ]),
      )
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  function reset(keepLocation: boolean) {
    setResult(null)
    setReplayed(false)
    setKey(newIdempotencyKey())
    commit.reset()
    pallet.reset()
    if (!keepLocation) location.reset()
  }

  if (result) {
    return (
      <PdaResult
        ok
        replayed={replayed}
        title="Stored"
        reference={result.transaction.txn_ref}
        details={[
          { label: 'Pallet', value: result.pallet.pallet_number ?? '—' },
          { label: 'Location', value: result.location.code },
          { label: 'Time', value: formatTime(result.transaction.created_at) },
        ]}
        actions={
          <>
            {/* Operators fill a lane in sequence, so the location is retained. */}
            <PdaButton onClick={() => reset(true)}>Next pallet, same location</PdaButton>
            <PdaButton tone="ghost" onClick={() => reset(false)}>
              Different location
            </PdaButton>
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

  const error = commit.error ?? location.error ?? pallet.error
  if (error) {
    return (
      <PdaError
        error={error}
        onRetry={() => {
          commit.reset()
          if (location.error) location.reset()
          if (pallet.error) pallet.reset()
        }}
      />
    )
  }

  return (
    <PdaGuard permission="putaway.perform" action="record put-away">
      {!location.location ? (
        <>
          <PdaStep step={1} total={3} label="Scan location" />
          <PdaScan prompt="Scan the location barcode" onScan={location.scan} busy={location.isScanning} />
        </>
      ) : !pallet.pallet ? (
        <div className="flex flex-col gap-3">
          <PdaStep step={2} total={3} label="Scan pallet" />
          <PdaValue
            label="Location"
            value={location.location.code}
            sub={[location.location.facility_name, location.location.zone_name].filter(Boolean).join(' · ')}
          />
          <PdaScan prompt="Scan the pallet label" onScan={pallet.scan} busy={pallet.isScanning} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <PdaStep step={3} total={3} label="Confirm" />
          <PdaValue label="Pallet" value={pallet.pallet.pallet_number ?? pallet.pallet.raw_barcode_value} sub={pallet.pallet.job_number ?? undefined} />
          <PdaValue label="Location" value={location.location.code} />
          <PdaButton onClick={() => commit.mutate()} busy={commit.isPending}>
            Confirm put-away
          </PdaButton>
          <PdaButton tone="ghost" onClick={() => pallet.reset()} disabled={commit.isPending}>
            Rescan pallet
          </PdaButton>
        </div>
      )}
    </PdaGuard>
  )
}
