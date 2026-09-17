'use client'

import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

import { PdaGuard } from '../pda-guard'
import { PdaButton, PdaResult, PdaScan, PdaStep, PdaValue } from '../pda-ui'
import { useLocationScan } from '@/features/operations/use-scan'
import { request } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import type { StockVerificationRow } from '@/lib/api/inventory-types'
import { cn } from '@/lib/cn'

/**
 * P-07 Stock check (docs/24 §4).
 *
 * A blind count: the expected pallets are never listed before scanning, because
 * showing them turns verification into confirmation (FR-034). The operator sees
 * only a running scanned count until the count is submitted.
 */
export function PdaStockCheck() {
  const location = useLocationScan()
  const [count, setCount] = useState<StockVerificationRow | null>(null)
  const [submitted, setSubmitted] = useState<StockVerificationRow | null>(null)

  const start = useMutation<StockVerificationRow, ApiError, string>({
    mutationFn: (locationId) =>
      request<StockVerificationRow>('/api/proxy/stock-verifications', {
        method: 'POST',
        body: { location_id: Number(locationId) },
      }),
    onSuccess: setCount,
  })

  const scan = useMutation<StockVerificationRow, ApiError, string>({
    mutationFn: (barcode) =>
      request<StockVerificationRow>(`/api/proxy/stock-verifications/${count!.id}/scan`, {
        method: 'POST',
        body: { pallet_barcode: barcode },
      }),
    onSuccess: setCount,
  })

  const submit = useMutation<StockVerificationRow, ApiError, void>({
    mutationFn: () =>
      request<StockVerificationRow>(`/api/proxy/stock-verifications/${count!.id}/submit`, { method: 'POST' }),
    onSuccess: setSubmitted,
  })

  if (submitted) {
    const clean = submitted.variance === 0
    return (
      <PdaResult
        ok={clean}
        title={clean ? 'Count matches' : 'Variance found'}
        reference={submitted.reference}
        details={[
          { label: 'Expected', value: String(submitted.expected_count) },
          { label: 'Scanned', value: String(submitted.scanned_count) },
          { label: 'Missing', value: String(submitted.missing_count) },
          { label: 'Unexpected', value: String(submitted.unexpected_count) },
        ]}
        actions={
          <>
            <p className="text-body-sm text-graphite-300">
              {clean
                ? 'Submitted for supervisor review.'
                : 'Submitted for supervisor review. Inventory is not changed by a count — a supervisor decides what to correct.'}
            </p>
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

  if (!location.location) {
    return (
      <PdaGuard permission="stockverify.create" action="run stock checks">
        <PdaStep step={1} total={3} label="Scan location to count" />
        <PdaScan prompt="Scan the location barcode" onScan={location.scan} busy={location.isScanning} />
        {location.error ? (
          <p className="mt-3 rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
            {location.error.message}
          </p>
        ) : null}
      </PdaGuard>
    )
  }

  if (!count) {
    return (
      <PdaGuard permission="stockverify.create" action="run stock checks">
        <div className="flex flex-col gap-3">
          <PdaStep step={2} total={3} label="Start count" />
          <PdaValue label="Location" value={location.location.code} />
          <p className="rounded-md border border-graphite-800 bg-graphite-900 p-3 text-body-sm text-graphite-400">
            This is a blind count. Scan every pallet you can physically see at this location. What the
            system expects is compared only after you submit.
          </p>
          {start.error ? (
            <p className="rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
              {start.error.message}
            </p>
          ) : null}
          <PdaButton onClick={() => start.mutate(location.location!.id)} busy={start.isPending}>
            Start count
          </PdaButton>
          <PdaButton tone="ghost" onClick={location.reset} disabled={start.isPending}>
            Different location
          </PdaButton>
        </div>
      </PdaGuard>
    )
  }

  return (
    <PdaGuard permission="stockverify.create" action="run stock checks">
      <div className="flex flex-col gap-3">
        <PdaStep step={3} total={3} label="Scan every pallet" />

        <div className="flex items-center justify-between rounded-lg border border-graphite-800 bg-graphite-900 p-4">
          <div>
            <p className="text-caption uppercase tracking-wide text-graphite-400">{count.reference}</p>
            <p className="font-mono text-mono text-graphite-300">{location.location.code}</p>
          </div>
          <p className="font-mono text-mono-xl text-graphite-0">{count.scanned_count}</p>
        </div>

        <PdaScan prompt="Scan a pallet" onScan={scan.mutate} busy={scan.isPending} />

        {scan.error ? (
          <p className={cn('rounded-md border p-3 text-body-sm', 'border-signal-dark-danger-fg bg-graphite-900 text-signal-dark-danger-fg')}>
            {scan.error.message}
          </p>
        ) : null}

        <PdaButton onClick={() => submit.mutate()} busy={submit.isPending} disabled={count.scanned_count === 0}>
          Submit count
        </PdaButton>
        {submit.error ? (
          <p className="rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
            {submit.error.message}
          </p>
        ) : null}
      </div>
    </PdaGuard>
  )
}
