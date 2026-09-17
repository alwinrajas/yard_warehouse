'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { PdaGuard } from '../pda-guard'
import { PdaButton, PdaScan, PdaStep, PdaValue } from '../pda-ui'
import { useLocationScan } from '@/features/operations/use-scan'
import { request } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import { statusKeyOf, type InventoryRow } from '@/lib/api/inventory-types'
import { formatDateTime } from '@/lib/format'
import { statusLabel } from '@/lib/status'

type AtLocation = {
  location: { code: string; facility_name: string | null; zone_name: string | null; capacity: number | null }
  pallets: InventoryRow[]
}

/** P-08 Location enquiry (docs/24 §4). What is here, right now. */
export function PdaLocationEnquiry() {
  const location = useLocationScan()

  const { data, isFetching, error } = useQuery<AtLocation, ApiError>({
    queryKey: ['pda-at-location', location.location?.id],
    queryFn: () => request<AtLocation>(`/api/proxy/inventory/location/${location.location!.id}`),
    enabled: location.location !== null,
    staleTime: 0,
  })

  if (!location.location) {
    return (
      <PdaGuard permission="inventory.view" action="view inventory">
        <PdaStep step={1} total={1} label="Scan location" />
        <PdaScan prompt="Scan the location barcode" onScan={location.scan} busy={location.isScanning} />
        {location.error ? (
          <p className="mt-3 rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
            {location.error.message}
          </p>
        ) : null}
      </PdaGuard>
    )
  }

  return (
    <PdaGuard permission="inventory.view" action="view inventory">
      <div className="flex flex-col gap-3">
        <PdaValue
          label="Location"
          value={location.location.code}
          sub={[location.location.facility_name, location.location.zone_name].filter(Boolean).join(' · ')}
        />

        {location.location.is_blocked ? (
          <p className="rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
            This location is blocked{location.location.blocked_reason ? `: ${location.location.blocked_reason}` : '.'}{' '}
            Nothing may be put away here.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
            {error.message}
          </p>
        ) : isFetching ? (
          <p className="p-3 text-body-sm text-graphite-400">Loading…</p>
        ) : (
          <>
            <p className="text-caption uppercase tracking-wide text-graphite-400">
              {data?.pallets.length ?? 0} pallet{(data?.pallets.length ?? 0) === 1 ? '' : 's'}
              {data?.location.capacity ? ` of ${data.location.capacity} capacity` : ''}
            </p>

            {(data?.pallets.length ?? 0) === 0 ? (
              <p className="rounded-lg border border-graphite-800 bg-graphite-900 p-6 text-center text-body text-graphite-400">
                Empty
              </p>
            ) : (
              data?.pallets.map((row) => (
                <div key={row.pallet_id} className="rounded-lg border border-graphite-800 bg-graphite-900 p-3">
                  <p className="font-mono text-mono-lg text-graphite-0">{row.pallet_number ?? '—'}</p>
                  <p className="text-body-sm text-graphite-400">
                    {statusLabel(statusKeyOf(row.display_status))}
                    {row.job_number ? ` · Job ${row.job_number}` : ''}
                  </p>
                  <p className="text-caption text-graphite-400">
                    Stored {formatDateTime(row.stored_at)}
                    {row.ageing_days !== null ? ` · ${row.ageing_days} days` : ''}
                  </p>
                </div>
              ))
            )}
          </>
        )}

        <PdaButton tone="ghost" onClick={location.reset}>
          Scan another location
        </PdaButton>
        <Link
          href="/pda"
          className="flex min-h-16 items-center justify-center rounded-lg border border-graphite-700 text-body uppercase text-graphite-300"
        >
          Back to home
        </Link>
      </div>
    </PdaGuard>
  )
}
