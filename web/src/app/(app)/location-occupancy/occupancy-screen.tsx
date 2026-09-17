'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import {
  Button,
  EmptyState,
  Panel,
  SearchInput,
  Select,
  Skeleton,
  Tooltip,
} from '@/components/ui'
import { useFacilityLookup } from '@/features/masters/use-lookups'
import { useApi } from '@/features/shared/use-api'
import type { OccupancyCell, OccupancyResponse } from '@/lib/api/inventory-types'
import { cn } from '@/lib/cn'
import { LOCATION_STATE_TOKENS } from '@/lib/status'
import { formatNumber } from '@/lib/format'
import { useUrlState } from '@/lib/url-state'

/**
 * W-04 Location Occupancy — the zone board (docs/23 §6).
 *
 * Deliberately not a table: the operational question is "where is there space",
 * which a spatial layout answers at a glance and a list does not.
 */
export function OccupancyScreen() {
  const router = useRouter()
  const url = useUrlState()
  const [view, setView] = useState<'board' | 'list'>('board')

  const facilityId = url.get('facility_id') ?? ''
  const stateFilter = url.get('state') ?? ''
  const search = url.get('search') ?? ''

  const params = new URLSearchParams()
  if (facilityId) params.set('facility_id', facilityId)
  if (search) params.set('search', search)

  const facilities = useFacilityLookup()
  const { data, isLoading, error, refetch } = useApi<OccupancyResponse>(
    ['occupancy', params.toString()],
    `/api/proxy/inventory/occupancy?${params.toString()}`,
  )

  const cells = (data?.locations ?? []).filter((c) => !stateFilter || c.state === stateFilter)

  const grouped = cells.reduce<Record<string, Record<string, OccupancyCell[]>>>((acc, cell) => {
    const facility = cell.facility_name ?? 'Unassigned facility'
    const zone = cell.zone_name ?? 'No zone'
    acc[facility] ??= {}
    acc[facility][zone] ??= []
    acc[facility][zone].push(cell)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Location Occupancy"
        context={
          data
            ? `${formatNumber(data.summary.occupied)} occupied · ${formatNumber(data.summary.empty)} empty · ${formatNumber(data.summary.blocked)} blocked`
            : 'Where stock sits, and where there is space'
        }
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Location Occupancy' }]}
        actions={
          <div className="flex items-center gap-1 rounded-md border border-graphite-300 p-0.5">
            {(['board', 'list'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-pressed={view === mode}
                className={cn(
                  'rounded px-3 py-1 text-body-sm capitalize',
                  view === mode ? 'bg-anodic-50 text-anodic-700' : 'text-graphite-600 hover:bg-graphite-50',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onDebouncedChange={(v) => url.set({ search: v })}
            placeholder="Search location code…"
            className="w-full max-w-64"
          />
          <Select
            ariaLabel="Facility"
            placeholder="All facilities"
            value={facilityId || 'all'}
            onValueChange={(v) => url.set({ facility_id: v === 'all' ? null : v })}
            options={[
              { value: 'all', label: 'All facilities' },
              ...(facilities.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })),
            ]}
            className="w-52"
          />
          <Select
            ariaLabel="State"
            placeholder="All states"
            value={stateFilter || 'all'}
            onValueChange={(v) => url.set({ state: v === 'all' ? null : v })}
            options={[
              { value: 'all', label: 'All states' },
              { value: 'empty', label: 'Empty' },
              { value: 'occupied', label: 'Occupied' },
              { value: 'full', label: 'At capacity' },
              { value: 'blocked', label: 'Blocked' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            className="w-44"
          />

          <ul className="ml-auto flex flex-wrap items-center gap-3">
            {Object.values(LOCATION_STATE_TOKENS).map((token) => (
              <li key={token.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    'size-3 rounded-[2px] border',
                    token.className,
                    token.pattern === 'hatch' && 'pattern-hatch',
                    token.pattern === 'dotted' && 'pattern-dotted',
                  )}
                />
                <span className="text-caption text-graphite-600">{token.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      {error ? (
        <Panel padded={false}>
          <EmptyState
            variant="error"
            title="Could not load the occupancy board"
            description={error.message}
            errorCode={error.code}
            action={
              <Button variant="primary" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        </Panel>
      ) : isLoading ? (
        <Panel>
          <Skeleton className="h-5 w-48" />
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(1.5rem,1fr))] gap-1">
            {Array.from({ length: 80 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </Panel>
      ) : cells.length === 0 ? (
        <Panel padded={false}>
          <EmptyState
            variant="no-data"
            title="No locations to show"
            description="Create or import locations to see the occupancy board."
            action={
              <Button variant="primary" onClick={() => router.push('/masters/locations')}>
                Go to locations
              </Button>
            }
          />
        </Panel>
      ) : view === 'list' ? (
        <Panel padded={false} className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <caption className="sr-only">Locations and occupancy</caption>
            <thead className="bg-graphite-50">
              <tr className="border-b border-graphite-200">
                {['Location', 'Facility', 'Zone', 'State', 'Pallets', 'Capacity'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 text-left text-overline uppercase text-graphite-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cells.map((cell) => (
                <tr
                  key={cell.id}
                  onClick={() => router.push(`/locations/${cell.id}`)}
                  className="cursor-pointer border-b border-graphite-200 hover:bg-graphite-25"
                >
                  <td className="px-4 py-2 font-mono text-mono text-graphite-900">{cell.code}</td>
                  <td className="px-4 py-2 text-graphite-600">{cell.facility_name}</td>
                  <td className="px-4 py-2 text-graphite-600">{cell.zone_name ?? '—'}</td>
                  <td className="px-4 py-2 capitalize text-graphite-700">{cell.state}</td>
                  <td className="px-4 py-2 tabular-nums">{cell.pallet_count}</td>
                  <td className="px-4 py-2 tabular-nums text-graphite-500">{cell.capacity ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([facility, zones]) => (
            <Panel key={facility}>
              <h2 className="text-h3 text-graphite-800">{facility}</h2>
              <div className="mt-4 flex flex-col gap-4">
                {Object.entries(zones).map(([zone, zoneCells]) => (
                  <div key={zone}>
                    <p className="mb-2 text-overline uppercase text-graphite-500">
                      {zone} · {zoneCells.length} location{zoneCells.length === 1 ? '' : 's'}
                    </p>
                    <div
                      role="grid"
                      aria-label={`${facility} ${zone} locations`}
                      className="grid grid-cols-[repeat(auto-fill,minmax(1.25rem,1fr))] gap-1"
                    >
                      {zoneCells.map((cell) => {
                        const token = LOCATION_STATE_TOKENS[cell.state]
                        return (
                          <Tooltip
                            key={cell.id}
                            content={
                              <span className="flex flex-col gap-0.5">
                                <span className="font-mono">{cell.code}</span>
                                <span>{token.label}</span>
                                <span>
                                  {cell.pallet_count} pallet{cell.pallet_count === 1 ? '' : 's'}
                                  {cell.capacity ? ` of ${cell.capacity}` : ''}
                                </span>
                                {cell.blocked_reason ? <span>{cell.blocked_reason}</span> : null}
                              </span>
                            }
                          >
                            <button
                              type="button"
                              role="gridcell"
                              aria-label={`${cell.code}, ${token.label}, ${cell.pallet_count} pallets`}
                              onClick={() => router.push(`/locations/${cell.id}`)}
                              className={cn(
                                'aspect-square rounded-[3px] border transition-transform duration-fast',
                                'hover:scale-125 hover:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-anodic-400',
                                token.className,
                                token.pattern === 'hatch' && 'pattern-hatch',
                                token.pattern === 'dotted' && 'pattern-dotted',
                                cell.has_ageing_stock && 'ring-2 ring-signal-warning-fg ring-offset-1',
                              )}
                            />
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
