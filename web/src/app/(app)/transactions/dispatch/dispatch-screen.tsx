'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { LocationRef } from '@/components/domain/location-ref'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { ScanField } from '@/components/domain/scan-field'
import { TransactionResult } from '@/components/domain/transaction-result'
import { Alert, Button, Field, Input, Textarea } from '@/components/ui'
import { OperationError } from '@/features/operations/operation-error'
import { OperationShell } from '@/features/operations/operation-shell'
import { useLocationScan, usePalletScan } from '@/features/operations/use-scan'
import { newIdempotencyKey } from '@/features/shared/idempotency'
import { requestDetailed } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import { statusKeyOf, type PalletDetail, type TransactionRow } from '@/lib/api/inventory-types'
import { formatDateTime } from '@/lib/format'

type Result = { transaction: TransactionRow; pallet: PalletDetail }

const STEPS = [
  { id: 'pallet', label: 'Pallet' },
  { id: 'verify', label: 'Verify location' },
  { id: 'confirm', label: 'Confirm' },
]

/** W-14 Dispatch (docs/23 §8). Irreversible without a correction, so the confirm says so. */
export function DispatchScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const queryClient = useQueryClient()
  const pallet = usePalletScan(false)
  const location = useLocationScan()

  const [delivery, setDelivery] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [remarks, setRemarks] = useState('')
  const [idempotencyKey, setKey] = useState(newIdempotencyKey)
  const [result, setResult] = useState<Result | null>(null)
  const [replayed, setReplayed] = useState(false)

  const commit = useMutation<{ data: Result; replayed: boolean }, ApiError, void>({
    mutationFn: () =>
      requestDetailed<Result>('/api/proxy/dispatch', {
        method: 'POST',
        body: {
          pallet_barcode: pallet.pallet!.raw_barcode_value,
          location_barcode: location.location?.code ?? null,
          delivery_reference: delivery.trim() || null,
          vehicle_reference: vehicle.trim() || null,
          remarks: remarks.trim() || null,
        },
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    onSuccess: ({ data, replayed: wasReplayed }) => {
      setResult(data)
      setReplayed(wasReplayed)
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  function reset() {
    setResult(null)
    setReplayed(false)
    setDelivery('')
    setVehicle('')
    setRemarks('')
    setKey(newIdempotencyKey())
    commit.reset()
    pallet.reset()
    location.reset()
  }

  const step = result ? 2 : pallet.pallet ? (location.location ? 2 : 1) : 0

  if (result) {
    return (
      <OperationShell title="Dispatch" context="Verify and release a pallet" breadcrumb="Dispatch" steps={STEPS} current={2}>
        <TransactionResult
          headingLevel={2}
          replayed={replayed}
          title="Pallet dispatched"
          reference={result.transaction.txn_ref}
          details={[
            { label: 'Pallet', value: result.pallet.pallet_number ?? '—', mono: true },
            { label: 'Delivery reference', value: delivery || '—' },
            { label: 'Time', value: formatDateTime(result.transaction.created_at) },
            { label: 'Status', value: 'Dispatched — removed from active inventory' },
          ]}
          actions={
            <>
              <Button variant="primary" size="sm" onClick={reset}>
                Dispatch another
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push(`/pallets/${result.pallet.id}`)}>
                View pallet history
              </Button>
            </>
          }
        />
      </OperationShell>
    )
  }

  return (
    <OperationShell title="Dispatch" context="Verify and release a pallet" breadcrumb="Dispatch" steps={STEPS} current={step}>
      <div className="flex flex-col gap-5">
        <ScanField
          label="Pallet to dispatch"
          placeholder={params.get('pallet') ?? 'Scan the pallet label'}
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
                    lpoNumber: pallet.pallet.lpo_number,
                    status: statusKeyOf(pallet.pallet.display_status),
                  }}
                  variant="hero"
                />
                {pallet.pallet.location ? (
                  <LocationRef
                    location={{
                      id: pallet.pallet.location.id,
                      code: pallet.pallet.location.code ?? '—',
                      facilityName: pallet.pallet.location.facility_name,
                      zoneName: pallet.pallet.location.zone_name,
                      state: 'occupied',
                    }}
                    variant="stacked"
                  />
                ) : null}
              </div>
            ) : undefined
          }
          error={pallet.error ? <OperationError error={pallet.error} onRetry={pallet.reset} /> : undefined}
        />

        {pallet.pallet ? (
          pallet.pallet.block_state !== 'NONE' ? (
            <Alert tone="warning" title={`This pallet is ${pallet.pallet.block_state.toLowerCase().replace('_', ' ')}`}>
              A blocked pallet cannot be dispatched through the normal flow. Release the hold first.
            </Alert>
          ) : (
            <ScanField
              label="Verify location"
              placeholder="Scan the location you are picking from"
              onScan={location.scan}
              resolving={location.isScanning}
              onClear={location.reset}
              resolved={
                location.location ? (
                  <LocationRef
                    location={{
                      id: location.location.id,
                      code: location.location.code,
                      facilityName: location.location.facility_name ?? null,
                      zoneName: location.location.zone_name ?? null,
                      state: 'occupied',
                    }}
                    variant="hero"
                  />
                ) : undefined
              }
              error={location.error ? <OperationError error={location.error} onRetry={location.reset} /> : undefined}
            />
          )
        ) : null}

        {pallet.pallet && pallet.pallet.block_state === 'NONE' && location.location ? (
          <>
            <Field label="Delivery reference" description="From the delivery order, where available.">
              <Input mono value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="DO-5512" />
            </Field>
            <Field label="Vehicle reference">
              <Input mono value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            </Field>
            <Field label="Remarks">
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} />
            </Field>

            {commit.error ? <OperationError error={commit.error} onRetry={reset} /> : null}

            <Alert tone="warning" title="Dispatch cannot be undone">
              Reversing a dispatch requires an authorised correction. Check the pallet and location
              before confirming.
            </Alert>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="lg"
                loading={commit.isPending}
                loadingLabel="Committing transaction…"
                onClick={() => commit.mutate()}
              >
                Confirm dispatch
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
