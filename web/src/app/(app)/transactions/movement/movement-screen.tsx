'use client'

import { ArrowRightLeft } from 'lucide-react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { LocationRef } from '@/components/domain/location-ref'
import { MovementDirection } from '@/components/domain/movement-direction'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { ScanField } from '@/components/domain/scan-field'
import { TransactionResult } from '@/components/domain/transaction-result'
import { Button, Field, Select, Textarea } from '@/components/ui'
import { useReasonCodes } from '@/features/masters/use-lookups'
import { OperationError } from '@/features/operations/operation-error'
import { OperationShell } from '@/features/operations/operation-shell'
import { useLocationScan, usePalletScan } from '@/features/operations/use-scan'
import { newIdempotencyKey } from '@/features/shared/idempotency'
import { requestDetailed } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import { statusKeyOf, type PalletDetail, type TransactionRow } from '@/lib/api/inventory-types'
import { formatDateTime } from '@/lib/format'

type Result = {
  transaction: TransactionRow
  pallet: PalletDetail
  from: { code: string }
  to: { code: string }
}

const STEPS = [
  { id: 'pallet', label: 'Pallet' },
  { id: 'destination', label: 'Destination' },
  { id: 'confirm', label: 'Confirm' },
]

/** W-13 Location Movement (docs/23 §10). Direction is the dominant visual (UX-04). */
export function MovementScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const queryClient = useQueryClient()
  const pallet = usePalletScan(false)
  const destination = useLocationScan()
  const reasons = useReasonCodes('TRANSFER')

  const [reasonId, setReasonId] = useState<string | undefined>()
  const [remarks, setRemarks] = useState('')
  const [idempotencyKey, setKey] = useState(newIdempotencyKey)
  const [result, setResult] = useState<Result | null>(null)
  const [replayed, setReplayed] = useState(false)

  const prefill = params.get('pallet')

  const commit = useMutation<{ data: Result; replayed: boolean }, ApiError, void>({
    mutationFn: () =>
      requestDetailed<Result>('/api/proxy/movements', {
        method: 'POST',
        body: {
          pallet_barcode: pallet.pallet!.raw_barcode_value,
          source_barcode: pallet.pallet!.location?.code ?? null,
          destination_barcode: destination.location!.code,
          reason_code_id: reasonId ? Number(reasonId) : null,
          remarks: remarks.trim() || null,
        },
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    onSuccess: ({ data, replayed: wasReplayed }) => {
      setResult(data)
      setReplayed(wasReplayed)
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['occupancy'] })
    },
  })

  function reset() {
    setResult(null)
    setReplayed(false)
    setRemarks('')
    setReasonId(undefined)
    setKey(newIdempotencyKey())
    commit.reset()
    pallet.reset()
    destination.reset()
  }

  const step = result ? 2 : pallet.pallet ? (destination.location ? 2 : 1) : 0

  if (result) {
    return (
      <OperationShell icon={<ArrowRightLeft className="size-5" />} title="Location Movement" context="Move a pallet between locations" breadcrumb="Movement" steps={STEPS} current={2}>
        <TransactionResult
          headingLevel={2}
          replayed={replayed}
          title="Pallet moved"
          reference={result.transaction.txn_ref}
          details={[
            { label: 'Pallet', value: result.pallet.pallet_number ?? '—', mono: true },
            { label: 'From', value: result.from.code, mono: true },
            { label: 'To', value: result.to.code, mono: true },
            { label: 'Time', value: formatDateTime(result.transaction.created_at) },
          ]}
          actions={
            <>
              <Button variant="primary" size="sm" onClick={reset}>
                Move another pallet
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push(`/pallets/${result.pallet.id}`)}>
                View pallet
              </Button>
            </>
          }
        />
      </OperationShell>
    )
  }

  return (
    <OperationShell icon={<ArrowRightLeft className="size-5" />} title="Location Movement" context="Move a pallet between locations" breadcrumb="Movement" steps={STEPS} current={step}>
      <div className="flex flex-col gap-5">
        <ScanField
          label="Pallet to move"
          placeholder={prefill ?? 'Scan the pallet label'}
          onScan={pallet.scan}
          resolving={pallet.isScanning}
          onClear={pallet.reset}
          resolved={
            pallet.pallet ? (
              <div className="flex flex-col gap-2">
                <PalletIdentity
                  pallet={{
                    id: pallet.pallet.id,
                    palletNumber: pallet.pallet.pallet_number ?? pallet.pallet.pallet_key,
                    jobNumber: pallet.pallet.job_number,
                    customerName: pallet.pallet.customer_name,
                    status: statusKeyOf(pallet.pallet.display_status),
                  }}
                  variant="hero"
                />
                {pallet.pallet.location ? (
                  <p className="text-body-sm text-graphite-600">
                    Currently at{' '}
                    <span className="font-mono text-mono text-graphite-900">
                      {pallet.pallet.location.code}
                    </span>
                  </p>
                ) : (
                  <p className="text-body-sm text-signal-danger-fg">
                    This pallet is not currently stored anywhere.
                  </p>
                )}
              </div>
            ) : undefined
          }
          error={pallet.error ? <OperationError error={pallet.error} onRetry={pallet.reset} /> : undefined}
        />

        {pallet.pallet?.location ? (
          <ScanField
            label="Destination location"
            placeholder="Scan the destination barcode"
            onScan={destination.scan}
            resolving={destination.isScanning}
            onClear={destination.reset}
            resolved={
              destination.location ? (
                <LocationRef
                  location={{
                    id: destination.location.id,
                    code: destination.location.code,
                    facilityName: destination.location.facility_name ?? null,
                    zoneName: destination.location.zone_name ?? null,
                    state: 'empty',
                  }}
                  variant="hero"
                />
              ) : undefined
            }
            error={destination.error ? <OperationError error={destination.error} onRetry={destination.reset} /> : undefined}
          />
        ) : null}

        {pallet.pallet?.location && destination.location ? (
          <>
            <div className="rounded-xl border border-graphite-200/80 bg-graphite-25 p-4">
              <MovementDirection
                orientation="vertical"
                fromLabel="Current location"
                toLabel="Destination"
                from={{
                  id: pallet.pallet.location.id,
                  code: pallet.pallet.location.code ?? '—',
                  facilityName: pallet.pallet.location.facility_name,
                  zoneName: pallet.pallet.location.zone_name,
                }}
                to={{
                  id: destination.location.id,
                  code: destination.location.code,
                  facilityName: destination.location.facility_name ?? null,
                  zoneName: destination.location.zone_name ?? null,
                }}
              />
            </div>

            <Field label="Reason" description="Why is this pallet being moved?">
              <Select
                ariaLabel="Movement reason"
                value={reasonId}
                onValueChange={setReasonId}
                placeholder={reasons.isLoading ? 'Loading…' : 'Optional'}
                options={(reasons.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
              />
            </Field>

            <Field label="Remarks">
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} />
            </Field>

            {commit.error ? <OperationError error={commit.error} onRetry={reset} /> : null}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="lg"
                loading={commit.isPending}
                loadingLabel="Committing transaction…"
                onClick={() => commit.mutate()}
              >
                Confirm move
              </Button>
              <Button variant="ghost" onClick={reset} disabled={commit.isPending}>
                Cancel
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </OperationShell>
  )
}
