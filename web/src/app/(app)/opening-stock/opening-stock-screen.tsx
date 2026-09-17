'use client'

import { PackagePlus } from 'lucide-react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

import { LocationRef } from '@/components/domain/location-ref'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { ScanField } from '@/components/domain/scan-field'
import { TransactionResult } from '@/components/domain/transaction-result'
import { PageHeader } from '@/components/layout/page-header'
import { Alert, Button, EmptyState, Field, Input, Panel, Skeleton, Textarea } from '@/components/ui'
import { OperationError } from '@/features/operations/operation-error'
import { useLocationScan, usePalletScan } from '@/features/operations/use-scan'
import { newIdempotencyKey } from '@/features/shared/idempotency'
import { useApi } from '@/features/shared/use-api'
import { requestDetailed } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import type { OpeningStockStatus } from '@/lib/api/admin-types'
import { statusKeyOf, type PalletDetail, type TransactionRow } from '@/lib/api/inventory-types'
import { formatDateTime, formatNumber } from '@/lib/format'

type Result = { transaction: TransactionRow; pallet: PalletDetail; location: { code: string } }

/**
 * W-30 Opening Stock (S-42, FR-035).
 *
 * Brings stock that was already in the yard on day one into the ledger. It is
 * deliberately the same path as a put-away rather than a shortcut around it:
 * the pallet is locked, the one-pallet-one-location invariant applies, and a
 * real OPENING_STOCK transaction is written.
 *
 * The arrival date can be backdated, because ageing must run from when the
 * stock actually arrived — starting every legacy pallet at zero would make the
 * first month of reporting after go-live wrong.
 */
export function OpeningStockScreen() {
  const queryClient = useQueryClient()
  const status = useApi<OpeningStockStatus>(['opening-stock'], '/api/proxy/opening-stock')

  const location = useLocationScan()
  const pallet = usePalletScan(true)
  const [storedSince, setStoredSince] = useState('')
  const [remarks, setRemarks] = useState('')
  const [key, setKey] = useState(newIdempotencyKey)
  const [result, setResult] = useState<Result | null>(null)
  const [replayed, setReplayed] = useState(false)

  const commit = useMutation<{ data: Result; replayed: boolean }, ApiError, void>({
    mutationFn: () =>
      requestDetailed<Result>('/api/proxy/opening-stock', {
        method: 'POST',
        body: {
          location_barcode: location.location!.code,
          pallet_barcode: pallet.pallet!.raw_barcode_value,
          stored_since: storedSince || null,
          remarks: remarks.trim() || null,
        },
        headers: { 'Idempotency-Key': key },
      }),
    onSuccess: ({ data, replayed: wasReplayed }) => {
      setResult(data)
      setReplayed(wasReplayed)
      void queryClient.invalidateQueries({ queryKey: ['opening-stock'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
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

  const header = (
    <PageHeader
      icon={<PackagePlus className="size-5" />}
      title="Opening Stock"
      context="Record what is already in the yard, once, at go-live"
      breadcrumbs={[{ label: 'Configuration', href: '/masters' }, { label: 'Opening Stock' }]}
    />
  )

  if (status.isLoading) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        {header}
        <Panel className="shadow-card">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-3 h-24 w-full" />
        </Panel>
      </div>
    )
  }

  if (status.error) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        {header}
        <Panel padded={false} className="shadow-card">
          <EmptyState
            headingLevel={2}
            variant="error"
            title="Could not load opening stock"
            description={status.error.message}
            errorCode={status.error.code}
          />
        </Panel>
      </div>
    )
  }

  if (!status.data?.enabled) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        {header}
        <Alert tone="info" title="Opening stock capture is switched off">
          This is intended for the go-live period only. A system administrator enables{' '}
          <span className="font-mono">{status.data?.setting_reference ?? 'CFG-17'}</span> in System
          Settings, and switches it off again once normal operation begins.
        </Alert>
        <Panel padded={false} className="shadow-card">
          <EmptyState
            headingLevel={2}
            variant="not-started"
            title="Nothing to capture yet"
            description="Once enabled, scan a location and a pallet to bring existing stock into the ledger."
            action={
              <Button variant="secondary" asChild>
                <Link href="/settings">Open System Settings</Link>
              </Button>
            }
          />
        </Panel>
      </div>
    )
  }

  if (result) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        {header}
        <TransactionResult
          headingLevel={2}
          replayed={replayed}
          title="Opening stock recorded"
          reference={result.transaction.txn_ref}
          details={[
            { label: 'Pallet', value: result.pallet.pallet_number ?? '—', mono: true },
            { label: 'Location', value: result.location.code, mono: true },
            { label: 'Arrived', value: formatDateTime(result.pallet.first_putaway_at) },
            { label: 'Status', value: 'Stored' },
          ]}
          actions={
            <>
              <Button variant="primary" size="sm" onClick={() => reset(true)}>
                Next pallet, same location
              </Button>
              <Button variant="secondary" size="sm" onClick={() => reset(false)}>
                Different location
              </Button>
            </>
          }
        />
      </div>
    )
  }

  const error = commit.error ?? location.error ?? pallet.error

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {header}

      <Alert tone="warning" title="This writes directly into live inventory">
        Every capture is a real transaction and follows the same rules as a put-away — a pallet
        already in inventory is refused, and a blocked location is refused. Switch{' '}
        <span className="font-mono">CFG-17</span> off once go-live is complete.
      </Alert>

      <Panel className="shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-h3 text-graphite-800">Capture</h2>
          <span className="text-body-sm text-graphite-500">
            {formatNumber(status.data.captured_count)} captured so far
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-5">
          {error ? <OperationError error={error} onRetry={() => {
            commit.reset()
            if (location.error) location.reset()
            if (pallet.error) pallet.reset()
          }} /> : null}

          <ScanField
            label="Storage location"
            placeholder="Scan or type the location barcode"
            onScan={location.scan}
            resolving={location.isScanning}
            resolved={
              location.location ? (
                <LocationRef
                  location={{
                    id: location.location.id,
                    code: location.location.code,
                    facilityName: location.location.facility_name ?? null,
                    zoneName: location.location.zone_name ?? null,
                    state: location.location.state,
                  }}
                />
              ) : null
            }
            onClear={location.reset}
          />

          {location.location ? (
            <ScanField
              label="Pallet"
              placeholder="Scan or type the pallet label"
              onScan={pallet.scan}
              resolving={pallet.isScanning}
              resolved={
                pallet.pallet ? (
                  <PalletIdentity
                    pallet={{
                      id: pallet.pallet.id,
                      palletNumber: pallet.pallet.pallet_number ?? pallet.pallet.raw_barcode_value,
                      jobNumber: pallet.pallet.job_number,
                      customerName: pallet.pallet.customer_name,
                      status: statusKeyOf(pallet.pallet.display_status),
                    }}
                  />
                ) : null
              }
              onClear={pallet.reset}
            />
          ) : null}

          {pallet.pallet ? (
            <>
              <Field
                label="Arrived at the yard"
                description="Leave blank for today. Backdate it so ageing reflects when the stock actually arrived."
              >
                <Input
                  type="date"
                  value={storedSince}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setStoredSince(e.target.value)}
                />
              </Field>

              <Field label="Remarks" description="Recorded on the transaction.">
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
              </Field>

              <div>
                <Button variant="primary" loading={commit.isPending} onClick={() => commit.mutate()}>
                  Record opening stock
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Panel>

      {status.data.recent.length > 0 ? (
        <Panel className="shadow-card">
          <h2 className="text-h3 text-graphite-800">Recently captured</h2>
          <ul className="mt-3 divide-y divide-graphite-200">
            {status.data.recent.map((txn) => (
              <li key={txn.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <span className="block font-mono text-mono text-graphite-900">
                    {txn.pallet_number ?? '—'}
                  </span>
                  <span className="block text-caption text-graphite-500">{txn.txn_ref}</span>
                </div>
                <div className="text-right">
                  <span className="block font-mono text-body-sm text-graphite-700">
                    {txn.destination_location_code ?? '—'}
                  </span>
                  <span className="block text-caption text-graphite-500">
                    {formatDateTime(txn.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  )
}
