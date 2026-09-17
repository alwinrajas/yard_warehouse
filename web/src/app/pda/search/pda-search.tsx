'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

import { PdaGuard } from '../pda-guard'
import { PdaScan, PdaStep } from '../pda-ui'
import { request } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import { statusKeyOf, type PalletDetail } from '@/lib/api/inventory-types'
import { formatDateTime } from '@/lib/format'
import { statusLabel } from '@/lib/status'

type SearchResponse = {
  pallets: PalletDetail[]
  jobs: { job_number: string; total: number; stored: number; dispatched: number }[]
}

/**
 * P-06 Search (docs/24 §4).
 *
 * Answers one question — where is it — with the location as the largest thing
 * on screen. A scan goes straight into the same field as typed input.
 */
export function PdaSearch() {
  const [term, setTerm] = useState('')

  const { data, isFetching, error } = useQuery<SearchResponse, ApiError>({
    queryKey: ['pda-search', term],
    queryFn: () => request<SearchResponse>(`/api/proxy/pallets/search?q=${encodeURIComponent(term)}`),
    enabled: term.length >= 2,
    staleTime: 0,
  })

  return (
    <PdaGuard permission="search.perform" action="search inventory">
      <PdaStep step={1} total={1} label="Find a pallet" />
      <PdaScan prompt="Scan or type a pallet, job or LPO number" onScan={setTerm} busy={isFetching} />

      {term.length >= 2 ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-caption uppercase tracking-wide text-graphite-400">
            Searching &ldquo;{term}&rdquo;
          </p>

          {error ? (
            <p className="rounded-md border border-signal-dark-danger-fg bg-graphite-900 p-3 text-body-sm text-signal-dark-danger-fg">
              {error.message}
            </p>
          ) : isFetching ? (
            <p className="p-3 text-body-sm text-graphite-400">Searching…</p>
          ) : (data?.pallets.length ?? 0) === 0 ? (
            <p className="rounded-md border border-graphite-800 bg-graphite-900 p-4 text-body-sm text-graphite-400">
              No pallet matches that. Check the number, or the pallet may never have been put away.
            </p>
          ) : (
            <>
              {data?.jobs.map((job) => (
                <div key={job.job_number} className="rounded-md border border-graphite-800 bg-graphite-900 p-3">
                  <p className="text-caption uppercase tracking-wide text-graphite-400">Job {job.job_number}</p>
                  <p className="mt-1 text-body-sm text-graphite-200">
                    {job.stored} stored · {job.dispatched} dispatched · {job.total} total
                  </p>
                </div>
              ))}

              {data?.pallets.map((pallet) => (
                <div key={pallet.id} className="rounded-lg border border-graphite-800 bg-graphite-900 p-4">
                  <p className="font-mono text-mono text-graphite-300">
                    {pallet.pallet_number ?? pallet.raw_barcode_value}
                  </p>
                  <p className="mt-1 font-mono text-mono-xl text-graphite-0">
                    {pallet.location?.code ?? 'Not in inventory'}
                  </p>
                  <p className="mt-1 text-body-sm text-graphite-400">
                    {statusLabel(statusKeyOf(pallet.display_status))}
                    {pallet.location?.facility_name ? ` · ${pallet.location.facility_name}` : ''}
                  </p>
                  {pallet.location?.stored_at ? (
                    <p className="text-caption text-graphite-400">
                      Stored {formatDateTime(pallet.location.stored_at)}
                      {pallet.ageing_days !== null ? ` · ${pallet.ageing_days} days` : ''}
                    </p>
                  ) : null}
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}

      <Link
        href="/pda"
        className="mt-4 flex min-h-16 items-center justify-center rounded-lg border border-graphite-700 text-body uppercase text-graphite-300"
      >
        Back to home
      </Link>
    </PdaGuard>
  )
}
