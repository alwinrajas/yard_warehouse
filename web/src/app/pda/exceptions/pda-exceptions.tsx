'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

import { PdaGuard } from '../pda-guard'
import { PdaButton, PdaResult, PdaScan, PdaStep, PdaValue } from '../pda-ui'
import { usePalletScan } from '@/features/operations/use-scan'
import { request } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import type { HoldRow } from '@/lib/api/inventory-types'
import type { ReasonCode } from '@/lib/api/types'
import { cn } from '@/lib/cn'

const HOLD_TYPES = [
  { value: 'HOLD', label: 'Hold', hint: 'Stop this pallet moving until released' },
  { value: 'DAMAGED', label: 'Damaged', hint: 'Physical damage found' },
  { value: 'EXCEPTION', label: 'Exception', hint: 'Something is wrong and needs a supervisor' },
] as const

/**
 * P-09 Raise exception (docs/24 §4).
 *
 * An operator can always raise a problem — placing a hold requires no
 * supervisor. Releasing one does, and is deliberately not available here.
 */
export function PdaExceptions() {
  const pallet = usePalletScan(false)
  const [holdType, setHoldType] = useState<(typeof HOLD_TYPES)[number]['value'] | null>(null)
  const [reasonId, setReasonId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [placed, setPlaced] = useState<HoldRow | null>(null)

  const reasons = useQuery<ReasonCode[], ApiError>({
    queryKey: ['reason-codes'],
    queryFn: () => request<ReasonCode[]>('/api/proxy/reason-codes'),
  })

  const applicable = (reasons.data ?? []).filter(
    (r) => r.is_active && (holdType === 'DAMAGED' ? r.category === 'DAMAGE' : r.category === 'HOLD' || r.category === 'DAMAGE'),
  )
  const selectedReason = applicable.find((r) => r.id === reasonId)
  const remarksRequired = selectedReason?.requires_remarks ?? false

  const place = useMutation<HoldRow, ApiError, void>({
    mutationFn: () =>
      request<HoldRow>('/api/proxy/holds', {
        method: 'POST',
        body: {
          pallet_id: Number(pallet.pallet!.id),
          hold_type: holdType,
          reason_code_id: Number(reasonId),
          remarks: remarks.trim() || null,
        },
      }),
    onSuccess: setPlaced,
  })

  function reset() {
    setPlaced(null)
    setHoldType(null)
    setReasonId(null)
    setRemarks('')
    place.reset()
    pallet.reset()
  }

  if (placed) {
    return (
      <PdaResult
        ok
        title="Hold placed"
        details={[
          { label: 'Pallet', value: placed.pallet_number ?? '—' },
          { label: 'Type', value: placed.hold_type },
          { label: 'Reason', value: placed.reason ?? '—' },
        ]}
        actions={
          <>
            <p className="text-body-sm text-graphite-300">
              This pallet cannot be moved or dispatched until a supervisor releases the hold.
            </p>
            <PdaButton onClick={reset}>Report another</PdaButton>
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

  return (
    <PdaGuard permission="hold.create" action="raise holds or exceptions">
      {!pallet.pallet ? (
        <>
          <PdaStep step={1} total={3} label="Scan the pallet" />
          <PdaScan prompt="Scan the pallet with the problem" onScan={pallet.scan} busy={pallet.isScanning} />
          {pallet.error ? (
            <p className="mt-3 rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
              {pallet.error.message}
            </p>
          ) : null}
        </>
      ) : !holdType ? (
        <div className="flex flex-col gap-3">
          <PdaStep step={2} total={3} label="What is wrong?" />
          <PdaValue label="Pallet" value={pallet.pallet.pallet_number ?? pallet.pallet.raw_barcode_value} />
          {HOLD_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setHoldType(type.value)}
              className="min-h-20 rounded-lg border border-graphite-700 bg-graphite-900 p-4 text-left active:bg-graphite-800"
            >
              <span className="block text-body font-medium uppercase tracking-wide text-graphite-0">
                {type.label}
              </span>
              <span className="block text-body-sm text-graphite-400">{type.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <PdaStep step={3} total={3} label="Reason" />
          <PdaValue label="Pallet" value={pallet.pallet.pallet_number ?? pallet.pallet.raw_barcode_value} sub={holdType} />

          {reasons.isLoading ? (
            <p className="p-3 text-body-sm text-graphite-400">Loading reasons…</p>
          ) : applicable.length === 0 ? (
            <p className="rounded-md border border-signal-dark-warning-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-warning-fg">
              No reason codes are configured for this hold type. A supervisor must add one before holds
              can be recorded.
            </p>
          ) : (
            applicable.map((reason) => (
              <button
                key={reason.id}
                type="button"
                onClick={() => setReasonId(reason.id)}
                className={cn(
                  'min-h-16 rounded-lg border p-3 text-left',
                  reasonId === reason.id
                    ? 'border-anodic-400 bg-anodic-900 text-graphite-0'
                    : 'border-graphite-700 bg-graphite-900 text-graphite-200',
                )}
              >
                <span className="block text-body">{reason.name}</span>
                <span className="block font-mono text-caption text-graphite-400">{reason.code}</span>
              </button>
            ))
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-caption uppercase tracking-wide text-graphite-400">
              Remarks{remarksRequired ? ' (required)' : ' (optional)'}
            </span>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="rounded-md border border-graphite-700 bg-graphite-950 p-3 text-body text-graphite-0 outline-none focus:border-anodic-400"
            />
          </label>

          {place.error ? (
            <p className="rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
              {place.error.message}
            </p>
          ) : null}

          <PdaButton
            tone="danger"
            onClick={() => place.mutate()}
            busy={place.isPending}
            disabled={!reasonId || (remarksRequired && !remarks.trim())}
          >
            Place hold
          </PdaButton>
          <PdaButton tone="ghost" onClick={() => setHoldType(null)} disabled={place.isPending}>
            Back
          </PdaButton>
        </div>
      )}
    </PdaGuard>
  )
}
