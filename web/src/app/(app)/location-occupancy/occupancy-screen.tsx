'use client'

import { Ban, Grid3x3, LayoutGrid, List, Rows3 } from 'lucide-react'
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
import { LOCATION_STATE_TOKENS, type LocationStateKey } from '@/lib/status'
import { formatNumber } from '@/lib/format'
import { useUrlState } from '@/lib/url-state'

type View = 'board' | 'compact' | 'list'

/**
 * W-04 Location Occupancy — the zone board (docs/23 §6).
 *
 * Deliberately not a table: the operational question is "where is there space",
 * which a spatial layout answers at a glance and a list does not.
 *
 * Three densities, because a 40-location warehouse and a 4,000-location yard are
 * not the same problem. `board` shows a readable card per location; `compact`
 * falls back to the heat-map grid once a card per location stops fitting on a
 * screen; `list` is there for anyone who needs to read or copy the codes.
 */
export function OccupancyScreen() {
  const router = useRouter()
  const url = useUrlState()
  const [view, setView] = useState<View>('board')

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

  const summary = data?.summary

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={<Grid3x3 className="size-5" />}
        title="Location Occupancy"
        context="Where stock sits, and where there is space"
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Location Occupancy' }]}
        meta={
          data ? (
            <span className="text-caption text-graphite-500">
              {formatNumber(cells.length)} location{cells.length === 1 ? '' : 's'} shown
            </span>
          ) : null
        }
        actions={
          <div
            role="group"
            aria-label="Board density"
            className="flex items-center gap-0.5 rounded-xl border border-graphite-200/80 bg-graphite-50/70 p-1 shadow-xs"
          >
            {(
              [
                { mode: 'board', label: 'Cards', icon: LayoutGrid },
                { mode: 'compact', label: 'Compact', icon: Rows3 },
                { mode: 'list', label: 'List', icon: List },
              ] as const
            ).map((option) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => setView(option.mode)}
                aria-pressed={view === option.mode}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-body-sm',
                  'transition-all duration-fast ease-standard',
                  view === option.mode
                    ? 'bg-graphite-0 font-semibold text-anodic-700 shadow-xs ring-1 ring-graphite-200/70'
                    : 'text-graphite-600 hover:bg-graphite-0/70 hover:text-graphite-900',
                )}
              >
                <option.icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>
        }
      />

      {/* State summary doubles as the filter: clicking a tile filters the board,
          so the count and the way to act on it are the same control. */}
      <section aria-label="Occupancy summary" className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            { key: '', label: 'All locations', value: summary?.total, color: 'var(--color-chart-6)' },
            { key: 'occupied', label: 'Occupied bays', value: summary?.occupied, color: 'var(--color-chart-1)' },
            { key: 'empty', label: 'Available bays', value: summary?.empty, color: 'var(--color-chart-2)' },
            { key: 'blocked', label: 'Blocked bays', value: summary?.blocked, color: 'var(--color-signal-danger-fg)' },
          ] as const
        ).map((tile) => {
          const active = stateFilter === tile.key
          return (
            <button
              key={tile.label}
              type="button"
              onClick={() => url.set({ state: tile.key || null })}
              aria-pressed={active}
              className={cn(
                'card-interactive relative flex flex-col items-start overflow-hidden rounded-2xl border',
                'bg-graphite-0 p-5 text-left shadow-card transition-all duration-fast',
                active ? 'border-anodic-500 ring-2 ring-anodic-200' : 'border-graphite-200/80 hover:border-anodic-300',
              )}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: tile.color }} />
              <span className="text-overline uppercase tracking-wider text-graphite-500 font-medium">
                {tile.label}
              </span>
              {isLoading ? (
                <Skeleton className="mt-3 h-8 w-20" />
              ) : (
                <span className="mt-3 text-display font-semibold leading-none tabular-nums text-graphite-900">
                  {formatNumber(tile.value ?? 0)}
                </span>
              )}
              <span className="mt-2 text-caption text-graphite-500">
                {active ? 'Filtering the board' : 'Click to filter board'}
              </span>
            </button>
          )
        })}
      </section>

      <Panel className="shadow-card">
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
              { value: 'empty', label: 'Available' },
              { value: 'occupied', label: 'Occupied' },
              { value: 'full', label: 'At capacity' },
              { value: 'blocked', label: 'Blocked' },
              { value: 'inactive', label: 'Not in use' },
            ]}
            className="w-44"
          />

          <ul className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {Object.values(LOCATION_STATE_TOKENS).map((token) => (
              <li key={token.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    'size-3 rounded-[3px] border',
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
        <Panel padded={false} className="shadow-card">
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
        <Panel className="shadow-card">
          <Skeleton className="h-5 w-48" />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </Panel>
      ) : cells.length === 0 ? (
        <Panel padded={false} className="shadow-card">
          <EmptyState
            variant={stateFilter || search ? 'no-results' : 'no-data'}
            title={stateFilter || search ? 'No location matches these filters' : 'No locations to show'}
            description={
              stateFilter || search
                ? 'Clear a filter, or check the location code.'
                : 'Create or import locations to see the occupancy board.'
            }
            action={
              stateFilter || search ? (
                <Button variant="secondary" onClick={() => url.clear()}>
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" onClick={() => router.push('/masters/locations')}>
                  Go to locations
                </Button>
              )
            }
          />
        </Panel>
      ) : view === 'list' ? (
        <Panel padded={false} className="overflow-x-auto shadow-card">
          <table className="w-full text-body-sm">
            <caption className="sr-only">Locations and occupancy</caption>
            <thead className="bg-surface-sunken">
              <tr className="border-b border-graphite-200">
                {['Location', 'Facility', 'Zone', 'State', 'Pallets', 'Capacity'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-2.5 text-left text-overline uppercase text-graphite-500"
                  >
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
                  className="cursor-pointer border-b border-graphite-200 last:border-0 hover:bg-graphite-25"
                >
                  <td className="px-4 py-2.5 font-mono text-mono text-graphite-900">{cell.code}</td>
                  <td className="px-4 py-2.5 text-graphite-600">{cell.facility_name}</td>
                  <td className="px-4 py-2.5 text-graphite-600">{cell.zone_name ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <StatePill state={cell.state} />
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{cell.pallet_count}</td>
                  <td className="px-4 py-2.5 tabular-nums text-graphite-500">
                    {cell.capacity ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([facility, zones]) => (
            <Panel key={facility} className="shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-h3 text-graphite-800">{facility}</h2>
                <span className="text-caption text-graphite-500">
                  {formatNumber(Object.values(zones).flat().length)} locations ·{' '}
                  {formatNumber(Object.values(zones).flat().reduce((n, c) => n + c.pallet_count, 0))}{' '}
                  pallets
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-5">
                {Object.entries(zones).map(([zone, zoneCells]) => (
                  <div key={zone}>
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      <p className="text-overline uppercase tracking-wide text-graphite-500">
                        {zone}
                      </p>
                      <span className="text-caption text-graphite-400">
                        {zoneCells.length} location{zoneCells.length === 1 ? '' : 's'}
                      </span>
                      <ZoneFill cells={zoneCells} />
                    </div>

                    {view === 'board' ? (
                      <div
                        role="grid"
                        aria-label={`${facility} ${zone} locations`}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8"
                      >
                        {zoneCells.map((cell) => (
                          <LocationTile
                            key={cell.id}
                            cell={cell}
                            onOpen={() => router.push(`/locations/${cell.id}`)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        role="grid"
                        aria-label={`${facility} ${zone} locations`}
                        className="grid grid-cols-[repeat(auto-fill,minmax(1.5rem,1fr))] gap-1"
                      >
                        {zoneCells.map((cell) => (
                          <HeatCell
                            key={cell.id}
                            cell={cell}
                            onOpen={() => router.push(`/locations/${cell.id}`)}
                          />
                        ))}
                      </div>
                    )}
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

/* ---------------------------------------------------------------- pieces */

/**
 * A location as a readable card.
 *
 * The code is the identifier the operator reads off a label, so it is mono and
 * the largest thing on the tile. Capacity is a bar because "3 of 4" is a
 * fullness question, and ageing is a ring because it is a property of the stock
 * inside rather than of the location itself.
 */
function LocationTile({ cell, onOpen }: { cell: OccupancyCell; onOpen: () => void }) {
  const token = LOCATION_STATE_TOKENS[cell.state]
  const fill = cell.capacity ? Math.min(1, cell.pallet_count / cell.capacity) : cell.pallet_count > 0 ? 1 : 0

  return (
    <button
      type="button"
      role="gridcell"
      onClick={onOpen}
      aria-label={`${cell.code}, ${token.label}, ${cell.pallet_count} pallet${cell.pallet_count === 1 ? '' : 's'}${cell.capacity ? ` of ${cell.capacity}` : ''}`}
      className={cn(
        'card-interactive group relative flex flex-col items-start gap-2 overflow-hidden rounded-xl border p-3 text-left shadow-xs transition-all duration-fast',
        token.className,
        token.pattern === 'hatch' && 'pattern-hatch',
        token.pattern === 'dotted' && 'pattern-dotted',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
        cell.has_ageing_stock && 'ring-2 ring-signal-warning-fg',
      )}
    >
      <span className="flex w-full items-center justify-between gap-1.5">
        <span className="truncate font-mono text-mono-lg font-semibold tracking-tight text-graphite-900">{cell.code}</span>
        {cell.state === 'blocked' ? (
          <Ban className="size-3.5 shrink-0 text-signal-danger-fg" aria-hidden />
        ) : (
          <span className="rounded px-1 py-0.2 text-overline uppercase tracking-wider text-graphite-600 bg-graphite-0/80 font-medium">
            {token.label}
          </span>
        )}
      </span>

      <span className="flex w-full items-baseline gap-1.5 mt-0.5">
        <span className="text-h2 font-semibold leading-none tabular-nums text-graphite-900">
          {cell.pallet_count}
        </span>
        {cell.capacity ? (
          <span className="text-caption font-medium tabular-nums text-graphite-500">/ {cell.capacity} bays</span>
        ) : null}
      </span>

      {cell.capacity ? (
        <span aria-hidden className="block h-1.5 w-full overflow-hidden rounded-full bg-graphite-200/50">
          <span
            className={cn(
              'anim-meter block h-full rounded-full transition-all',
              fill >= 1 ? 'bg-anodic-800' : 'bg-anodic-500',
            )}
            style={{ width: `${fill * 100}%` }}
          />
        </span>
      ) : null}

      {cell.blocked_reason ? (
        <span className="w-full truncate text-caption font-medium text-signal-danger-fg">
          {cell.blocked_reason}
        </span>
      ) : null}
    </button>
  )
}

/** The dense fallback: one square per location, for yards too large to card. */
function HeatCell({ cell, onOpen }: { cell: OccupancyCell; onOpen: () => void }) {
  const token = LOCATION_STATE_TOKENS[cell.state]

  return (
    <Tooltip
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
        onClick={onOpen}
        className={cn(
          'aspect-square rounded-[3px] border transition-transform duration-fast',
          'hover:z-10 hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-anodic-400',
          token.className,
          token.pattern === 'hatch' && 'pattern-hatch',
          token.pattern === 'dotted' && 'pattern-dotted',
          cell.has_ageing_stock && 'ring-2 ring-signal-warning-fg ring-offset-1',
        )}
      />
    </Tooltip>
  )
}

function StatePill({ state }: { state: LocationStateKey }) {
  const token = LOCATION_STATE_TOKENS[state]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          'size-2.5 rounded-[3px] border',
          token.className,
          token.pattern === 'hatch' && 'pattern-hatch',
          token.pattern === 'dotted' && 'pattern-dotted',
        )}
      />
      <span className="text-graphite-700">{token.label}</span>
    </span>
  )
}

/** How full a zone is, as a single bar beside its name. */
function ZoneFill({ cells }: { cells: OccupancyCell[] }) {
  const withCapacity = cells.filter((c) => c.capacity)
  if (withCapacity.length === 0) return null

  const used = withCapacity.reduce((n, c) => n + c.pallet_count, 0)
  const total = withCapacity.reduce((n, c) => n + (c.capacity ?? 0), 0)
  if (total === 0) return null

  const share = Math.min(1, used / total)

  return (
    <span className="ml-auto flex items-center gap-2">
      <span aria-hidden className="h-1.5 w-24 overflow-hidden rounded-full bg-graphite-100">
        <span
          className={cn(
            'anim-meter block h-full rounded-full',
            share >= 0.9 ? 'bg-signal-warning-fg' : 'bg-anodic-500',
          )}
          style={{ width: `${share * 100}%` }}
        />
      </span>
      <span className="text-caption tabular-nums text-graphite-500">
        {Math.round(share * 100)}% full
      </span>
    </span>
  )
}
