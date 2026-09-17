'use client'

import { Boxes, Grid3x3, Package, TriangleAlert, Truck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { AgeingIndicator } from '@/components/domain/ageing-indicator'
import { LocationRef } from '@/components/domain/location-ref'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { StatusBadge } from '@/components/domain/status-badge'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Button,
  EmptyState,
  KpiCard,
  KpiSkeleton,
  Panel,
  PanelHeader,
  Skeleton,
} from '@/components/ui'
import { useApi } from '@/features/shared/use-api'
import type { DashboardResponse } from '@/lib/api/inventory-types'
import { statusKeyOf } from '@/lib/api/inventory-types'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'

/**
 * W-01 Operational Dashboard (docs/23 §3).
 *
 * Every tile and bar is a link into a pre-filtered working view — a KPI you
 * cannot drill into is decoration (UX-06).
 */
export function DashboardScreen() {
  const router = useRouter()
  const { data, isLoading, error, refetch } = useApi<DashboardResponse>(
    ['dashboard'],
    '/api/proxy/dashboard',
  )

  const k = data?.kpis
  const go = (href: string) => () => router.push(href)

  const attention = [
    k?.holds_exceptions
      ? { label: `${k.holds_exceptions} pallet${k.holds_exceptions === 1 ? '' : 's'} on hold or in exception`, href: '/holds-exceptions' }
      : null,
    k?.blocked_locations
      ? { label: `${k.blocked_locations} location${k.blocked_locations === 1 ? '' : 's'} blocked`, href: '/location-occupancy?blocked=blocked' }
      : null,
    k?.ageing_over_threshold
      ? { label: `${k.ageing_over_threshold} pallet${k.ageing_over_threshold === 1 ? '' : 's'} over the ageing threshold`, href: '/inventory?ageing=critical' }
      : null,
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Operational overview"
        context="Live yard and warehouse state"
        actions={
          <Button variant="secondary" onClick={() => void refetch()}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <Alert tone="danger" title="Could not load the dashboard" live>
          {error.message}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />)
            : (
                [
                  { label: 'Active pallets', value: k?.total_active ?? 0, href: '/inventory' },
                  { label: 'Open yard', value: k?.open_yard ?? 0, href: '/inventory' },
                  { label: 'Closed warehouse', value: k?.closed_warehouse ?? 0, href: '/inventory' },
                  { label: 'Ageing over threshold', value: k?.ageing_over_threshold ?? 0, href: '/inventory?ageing=critical', tone: 'attention' as const },
                  { label: 'Today put-away', value: k?.today_putaway ?? 0, href: '/transactions?type=PUTAWAY' },
                  { label: 'Today transfers', value: k?.today_transfers ?? 0, href: '/transactions?type=TRANSFER' },
                  { label: 'Today dispatch', value: k?.today_dispatch ?? 0, href: '/transactions?type=DISPATCH' },
                  { label: 'Holds & exceptions', value: k?.holds_exceptions ?? 0, href: '/holds-exceptions', tone: (k?.holds_exceptions ? 'attention' : 'neutral') as 'attention' | 'neutral' },
                ] as const
              ).map((tile) => (
                <KpiCard
                  key={tile.label}
                  label={tile.label}
                  value={tile.value}
                  tone={'tone' in tile ? tile.tone : 'neutral'}
                  onClick={go(tile.href)}
                />
              ))}
        </div>

        <Panel>
          <PanelHeader title="Needs attention" />
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : attention.length === 0 ? (
            <p className="text-body-sm text-graphite-500">
              Nothing needs attention. No holds, no blocked locations, nothing past the ageing
              threshold.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {attention.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-2 rounded-md p-1.5 text-body-sm text-graphite-700 hover:bg-graphite-50"
                  >
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-signal-warning-fg" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Stock by facility" />
          <BarList
            loading={isLoading}
            rows={(data?.by_facility ?? []).map((r) => ({ label: r.name, value: Number(r.total) }))}
            href="/inventory"
          />
        </Panel>

        <Panel>
          <PanelHeader title="Stock by status" />
          <BarList
            loading={isLoading}
            rows={(data?.by_status ?? []).map((r) => ({ label: r.status, value: Number(r.total) }))}
            href="/inventory"
            renderLabel={(label) => <StatusBadge status={statusKeyOf(label)} />}
          />
        </Panel>

        <Panel>
          <PanelHeader title="Ageing distribution" />
          <BarList
            loading={isLoading}
            rows={[
              { label: '0–7 days', value: data?.ageing.fresh ?? 0, href: '/inventory?ageing=fresh' },
              { label: '8–15 days', value: data?.ageing.normal ?? 0, href: '/inventory?ageing=normal' },
              { label: '16–30 days', value: data?.ageing.attention ?? 0, href: '/inventory?ageing=attention' },
              { label: 'Over 30 days', value: data?.ageing.critical ?? 0, href: '/inventory?ageing=critical' },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Location utilisation" />
          <BarList
            loading={isLoading}
            rows={[
              { label: 'Occupied', value: k?.occupied_locations ?? 0, href: '/location-occupancy' },
              { label: 'Empty', value: k?.empty_locations ?? 0, href: '/location-occupancy?state=empty' },
              { label: 'Blocked', value: k?.blocked_locations ?? 0, href: '/location-occupancy?state=blocked' },
            ]}
          />
        </Panel>

        <Panel padded={false}>
          <div className="p-5 pb-3">
            <PanelHeader title="Oldest awaiting dispatch" className="mb-0" />
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-2 px-5 pb-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (data?.oldest_awaiting_dispatch ?? []).length === 0 ? (
            <EmptyState compact variant="no-data" title="No stored pallets yet" headingLevel={3} />
          ) : (
            <ul className="divide-y divide-graphite-200 border-t border-graphite-200">
              {data!.oldest_awaiting_dispatch.map((row) => (
                <li key={row.pallet_id}>
                  <Link
                    href={`/pallets/${row.pallet_id}`}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-graphite-25"
                  >
                    <PalletIdentity
                      pallet={{
                        id: row.pallet_id,
                        palletNumber: row.pallet_number ?? '—',
                        jobNumber: row.job_number,
                        status: statusKeyOf(row.display_status),
                      }}
                      variant="stacked"
                      showStatus={false}
                    />
                    <LocationRef
                      location={{ id: row.location_id, code: row.location_code ?? '—', facilityName: row.facility_name }}
                      showState={false}
                    />
                    <AgeingIndicator days={row.ageing_days} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <nav aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/transactions/put-away', label: 'Put-away', icon: Package },
          { href: '/transactions/movement', label: 'Movement', icon: Boxes },
          { href: '/transactions/dispatch', label: 'Dispatch', icon: Truck },
          { href: '/location-occupancy', label: 'Occupancy board', icon: Grid3x3 },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'flex items-center gap-3 rounded-lg border border-graphite-200 bg-graphite-0 p-4',
              'text-body-sm text-graphite-700 transition-colors duration-fast hover:border-graphite-300 hover:bg-graphite-25',
            )}
          >
            <action.icon className="size-4 text-graphite-500" aria-hidden />
            {action.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function BarList({
  rows,
  loading,
  href,
  renderLabel,
}: {
  rows: { label: string; value: number; href?: string }[]
  loading?: boolean
  href?: string
  renderLabel?: (label: string) => React.ReactNode
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return <p className="text-body-sm text-graphite-500">No data yet.</p>
  }

  const max = Math.max(...rows.map((r) => r.value), 1)

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const body = (
          <span className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-body-sm text-graphite-700">
              {renderLabel ? renderLabel(row.label) : row.label}
            </span>
            <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-graphite-100">
              <span
                className="block h-full rounded-full bg-anodic-400"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right text-body-sm tabular-nums text-graphite-900">
              {formatNumber(row.value)}
            </span>
          </span>
        )

        const target = row.href ?? href
        return (
          <li key={row.label}>
            {target ? (
              <Link href={target} className="block rounded-md p-1 hover:bg-graphite-50">
                {body}
              </Link>
            ) : (
              <span className="block p-1">{body}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
