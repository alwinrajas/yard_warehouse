'use client'

import { PackagePlus } from 'lucide-react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { LocationRef } from '@/components/domain/location-ref'
import { MovementDirection } from '@/components/domain/movement-direction'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { ScanField } from '@/components/domain/scan-field'
import { TransactionResult } from '@/components/domain/transaction-result'
import { Button, Field, Textarea } from '@/components/ui'
import { OperationError } from '@/features/operations/operation-error'
import { OperationShell } from '@/features/operations/operation-shell'
import { useLocationScan, usePalletScan } from '@/features/operations/use-scan'
import { newIdempotencyKey } from '@/features/shared/idempotency'
import { requestDetailed } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import { statusKeyOf, type PalletDetail, type TransactionRow } from '@/lib/api/inventory-types'
import { formatDateTime } from '@/lib/format'

type Result = { transaction: TransactionRow; pallet: PalletDetail; location: { code: string } }

const STEPS = [
  { id: 'location', label: 'Location' },
  { id: 'pallet', label: 'Pallet' },
  { id: 'confirm', label: 'Confirm' },
]

/** W-12 Put-Away (docs/23 §7). Location first, so a blocked lane is caught early. */
export function PutAwayScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const location = useLocationScan()
  const pallet = usePalletScan(true)
  const [remarks, setRemarks] = useState('')
  const [idempotencyKey, setKey] = useState(newIdempotencyKey)
  const [result, setResult] = useState<Result | null>(null)
  const [replayed, setReplayed] = useState(false)

  const commit = useMutation<{ data: Result; replayed: boolean }, ApiError, void>({
    mutationFn: () =>
      requestDetailed<Result>('/api/proxy/putaway', {
        method: 'POST',
        body: {
          location_barcode: location.location!.code,
          pallet_barcode: pallet.pallet!.raw_barcode_value,
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

  function reset(keepLocation: boolean) {
    setResult(null)
    setReplayed(false)
    setRemarks('')
    setKey(newIdempotencyKey())
    commit.reset()
    pallet.reset()
    if (!keepLocation) location.reset()
  }

  const step = result ? 2 : location.location ? (pallet.pallet ? 2 : 1) : 0

  if (result) {
    return (
      <OperationShell
        icon={<PackagePlus className="size-5" />}
        title="Put-Away"
        context="Bring a pallet into live inventory"
        breadcrumb="Put-Away"
        steps={STEPS}
        current={2}
      >
        <TransactionResult
          headingLevel={2}
          replayed={replayed}
          title="Pallet stored"
          reference={result.transaction.txn_ref}
          details={[
            { label: 'Pallet', value: result.pallet.pallet_number ?? '—', mono: true },
            { label: 'Location', value: result.location.code, mono: true },
            { label: 'Time', value: formatDateTime(result.transaction.created_at) },
            { label: 'Status', value: 'Stored' },
          ]}
          actions={
            <>
              {/* Operators fill a lane in sequence, so the location is retained. */}
              <Button variant="primary" size="sm" onClick={() => reset(true)}>
                Put away another here
              </Button>
              <Button variant="secondary" size="sm" onClick={() => reset(false)}>
                Different location
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
    <OperationShell
      icon={<PackagePlus className="size-5" />}
      title="Put-Away"
      context="Bring a pallet into live inventory"
      breadcrumb="Put-Away"
      steps={STEPS}
      current={step}
    >
      <div className="flex flex-col gap-5">
        <ScanField
          label="Storage location"
          placeholder="Scan the location barcode"
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
                  state: 'empty',
                  capacity: location.location.capacity,
                }}
                variant="hero"
              />
            ) : undefined
          }
          error={location.error ? <OperationError error={location.error} onRetry={location.reset} /> : undefined}
        />

        {location.location ? (
          <ScanField
            label="Pallet"
            placeholder="Scan the ERP pallet label"
            onScan={pallet.scan}
            resolving={pallet.isScanning}
            onClear={pallet.reset}
            resolved={
              pallet.pallet ? (
                <div>
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
                  {!pallet.pallet.job_number ? (
                    <p className="mt-2 text-caption text-graphite-500">
                      Job and customer are not encoded on this label. They can be added by import.
                    </p>
                  ) : null}
                </div>
              ) : undefined
            }
            error={pallet.error ? <OperationError error={pallet.error} onRetry={pallet.reset} /> : undefined}
          />
        ) : null}

        {location.location && pallet.pallet ? (
          <>
            <div className="rounded-xl border border-graphite-200/80 bg-graphite-25 p-4">
              <MovementDirection
                orientation="vertical"
                fromLabel="Pallet"
                toLabel="Store at"
                from={{
                  id: pallet.pallet.id,
                  code: pallet.pallet.pallet_number ?? pallet.pallet.pallet_key,
                  facilityName: pallet.pallet.job_number,
                }}
                to={{
                  id: location.location.id,
                  code: location.location.code,
                  facilityName: location.location.facility_name ?? null,
                  zoneName: location.location.zone_name ?? null,
                }}
              />
            </div>

            <Field label="Remarks" description="Optional. Recorded on the transaction.">
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} />
            </Field>

            {commit.error ? (
              <OperationError
                error={commit.error}
                onRetry={() => {
                  setKey(newIdempotencyKey())
                  reset(true)
                }}
              />
            ) : null}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="lg"
                loading={commit.isPending}
                loadingLabel="Committing transaction…"
                onClick={() => commit.mutate()}
              >
                Confirm put-away
              </Button>
              <Button variant="ghost" onClick={() => reset(false)} disabled={commit.isPending}>
                Cancel
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </OperationShell>
  )
}
