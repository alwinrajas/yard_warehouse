'use client'

import {
  ArrowRightLeft,
  Ban,
  Boxes,
  Clock,
  Gauge,
  Grid3x3,
  Hourglass,
  LayoutDashboard,
  Package,
  PackageCheck,
  RefreshCw,
  TriangleAlert,
  Truck,
  Warehouse,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { AgeingIndicator } from '@/components/domain/ageing-indicator'
import { LocationRef } from '@/components/domain/location-ref'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { StatusBadge } from '@/components/domain/status-badge'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Button,
  Donut,
  DonutLegend,
  EmptyState,
  KpiCard,
  KpiSkeleton,
  Meter,
  Panel,
  PanelHeader,
  Skeleton,
  type DonutSlice,
} from '@/components/ui'
import { useApi } from '@/features/shared/use-api'
import type { DashboardResponse } from '@/lib/api/inventory-types'
import { statusKeyOf } from '@/lib/api/inventory-types'
import { cn } from '@/lib/cn'
import { formatNumber, formatTime } from '@/lib/format'

/**
 * W-01 Operational Dashboard (docs/23 §3).
 *
 * A command centre, not a tile wall. The first viewport answers, in order:
 * how much stock is live, where it is, what moved today, and what needs a
 * person. Everything is a link into a pre-filtered working view — a KPI you
 * cannot drill into is decoration (UX-06).
 */
export function DashboardScreen() {
  const router = useRouter()
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useApi<DashboardResponse>(
    ['dashboard'],
    '/api/proxy/dashboard',
  )

  const k = data?.kpis
  const go = (href: string) => () => router.push(href)

  const totalLocations =
    (k?.occupied_locations ?? 0) + (k?.empty_locations ?? 0) + (k?.blocked_locations ?? 0)
  const utilisation =
    totalLocations > 0 ? Math.round(((k?.occupied_locations ?? 0) / totalLocations) * 100) : 0

  const attention = buildAttention(data)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={<LayoutDashboard className="size-5" />}
        title="Operational overview"
        context="Live yard and warehouse state"
        meta={
          <span className="inline-flex items-center gap-1.5 text-caption text-graphite-500">
            <Clock className="size-3.5" aria-hidden />
            {dataUpdatedAt ? `Updated ${formatTime(new Date(dataUpdatedAt))}` : 'Loading…'}
          </span>
        }
        actions={
          <Button
            variant="secondary"
            onClick={() => void refetch()}
            loading={isFetching && !isLoading}
            leftIcon={<RefreshCw className="size-4" />}
          >
            Refresh
          </Button>
        }
      />

      {error ? (
        <Alert tone="danger" title="Could not load the dashboard" live>
          {error.message}
        </Alert>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* What is live, and where                                          */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Live inventory" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="Active pallets"
              value={k?.total_active ?? 0}
              tone="primary"
              icon={<Boxes className="size-4" />}
              footer="Currently in inventory"
              onClick={go('/inventory')}
            />
            <KpiCard
              label="Open yard"
              value={k?.open_yard ?? 0}
              icon={<Warehouse className="size-4" />}
              footer={share(k?.open_yard, k?.total_active)}
              onClick={go('/inventory?facility_type=OPEN_YARD')}
            />
            <KpiCard
              label="Closed warehouse"
              value={k?.closed_warehouse ?? 0}
              icon={<Package className="size-4" />}
              footer={share(k?.closed_warehouse, k?.total_active)}
              onClick={go('/inventory?facility_type=CLOSED_WAREHOUSE')}
            />
            <KpiCard
              label="Location utilisation"
              value={`${utilisation}%`}
              tone={utilisation >= 90 ? 'warning' : 'neutral'}
              icon={<Gauge className="size-4" />}
              visual={
                <span
                  aria-hidden
                  className="block h-1.5 w-full overflow-hidden rounded-full bg-graphite-100"
                >
                  <span
                    className={cn(
                      'anim-meter block h-full rounded-full',
                      utilisation >= 90 ? 'bg-signal-warning-fg' : 'bg-anodic-500',
                    )}
                    style={{ width: `${utilisation}%` }}
                  />
                </span>
              }
              footer={`${formatNumber(k?.occupied_locations ?? 0)} of ${formatNumber(totalLocations)} locations in use`}
              onClick={go('/location-occupancy')}
            />
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Today's movement, and what is going wrong                        */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Today and exceptions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="Put-away today"
              value={k?.today_putaway ?? 0}
              tone="success"
              icon={<PackageCheck className="size-4" />}
              footer="Pallets brought into stock"
              onClick={go('/transactions?type=PUTAWAY')}
            />
            <KpiCard
              label="Transfers today"
              value={k?.today_transfers ?? 0}
              icon={<ArrowRightLeft className="size-4" />}
              footer="Internal relocations"
              onClick={go('/transactions?type=TRANSFER')}
            />
            <KpiCard
              label="Dispatched today"
              value={k?.today_dispatch ?? 0}
              icon={<Truck className="size-4" />}
              footer="Left the yard"
              onClick={go('/transactions?type=DISPATCH')}
            />
            <KpiCard
              label="Holds & exceptions"
              value={k?.holds_exceptions ?? 0}
              tone={k?.holds_exceptions ? 'danger' : 'neutral'}
              icon={<TriangleAlert className="size-4" />}
              footer={k?.holds_exceptions ? 'Blocked from dispatch' : 'Nothing held'}
              onClick={go('/holds-exceptions')}
            />
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Where the stock is, and what state it is in                      */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Distribution" className="grid gap-4 lg:grid-cols-3">
        <Panel className="shadow-card">
          <PanelHeader
            title="Stock by facility"
            description="Where live inventory is sitting"
            actions={<PanelLink href="/inventory">Inventory</PanelLink>}
          />
          {isLoading ? (
            <DonutSkeleton />
          ) : (data?.by_facility ?? []).length === 0 ? (
            <EmptyState compact variant="no-data" title="No stock recorded yet" headingLevel={3} />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <Donut
                slices={facilitySlices(data!)}
                caption="pallets"
                size={150}
                thickness={17}
              />
              <DonutLegend slices={facilitySlices(data!)} />
            </div>
          )}
        </Panel>

        <Panel className="shadow-card">
          <PanelHeader
            title="Stock by status"
            description="Stored, held, staged, in movement"
            actions={<PanelLink href="/inventory">Inventory</PanelLink>}
          />
          {isLoading ? (
            <DonutSkeleton />
          ) : (data?.by_status ?? []).length === 0 ? (
            <EmptyState compact variant="no-data" title="No stock recorded yet" headingLevel={3} />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <Donut slices={statusSlices(data!)} caption="pallets" size={150} thickness={17} />
              <DonutLegend
                slices={statusSlices(data!)}
                renderLabel={(slice) => <StatusBadge status={statusKeyOf(slice.label)} />}
              />
            </div>
          )}
        </Panel>

        <Panel className="shadow-card">
          <PanelHeader
            title="Ageing profile"
            description="How long stock has been standing"
            actions={<PanelLink href="/reports/ageing">Report</PanelLink>}
          />
          {isLoading ? (
            <BarSkeleton rows={4} />
          ) : (
            <div className="flex flex-col gap-3">
              {ageingRows(data).map((row) => (
                <Link
                  key={row.label}
                  href={row.href}
                  className="-mx-1.5 rounded-md px-1.5 py-1 hover:bg-graphite-50"
                >
                  <Meter
                    label={row.label}
                    value={row.value}
                    max={Math.max(...ageingRows(data).map((r) => r.value), 1)}
                    color={row.color}
                  />
                </Link>
              ))}
              <p className="mt-1 border-t border-graphite-200 pt-3 text-caption text-graphite-500">
                Ageing runs from when a pallet arrived, and an internal move does not reset it.
              </p>
            </div>
          )}
        </Panel>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Needs attention + location utilisation                           */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Attention" className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel padded={false} className="overflow-hidden shadow-card">
          <div className="flex items-start justify-between gap-4 p-5 pb-4">
            <div>
              <h3 className="flex items-center gap-2 text-h3 text-graphite-800">
                Needs attention
                {attention.length > 0 ? (
                  <span className="rounded-full bg-signal-danger-surface px-2 py-0.5 text-caption tabular-nums text-signal-danger-fg">
                    {attention.length}
                  </span>
                ) : null}
              </h3>
              <p className="mt-0.5 text-caption text-graphite-500">
                Conditions that stop stock moving
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2 px-5 pb-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : attention.length === 0 ? (
            <div className="border-t border-graphite-200">
              <EmptyState
                compact
                variant="no-data"
                headingLevel={4}
                title="Nothing needs attention"
                description="No holds, no blocked locations, nothing past the ageing threshold."
              />
            </div>
          ) : (
            <ul className="divide-y divide-graphite-200 border-t border-graphite-200">
              {attention.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors duration-fast hover:bg-graphite-25"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        item.tone === 'danger'
                          ? 'bg-signal-danger-surface text-signal-danger-fg'
                          : 'bg-signal-warning-surface text-signal-warning-fg',
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-body-sm font-medium text-graphite-900">
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-overline uppercase',
                            item.tone === 'danger'
                              ? 'bg-signal-danger-surface text-signal-danger-fg'
                              : 'bg-signal-warning-surface text-signal-warning-fg',
                          )}
                        >
                          {item.severity}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-caption text-graphite-500">
                        {item.detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-body-sm text-anodic-600 group-hover:underline">
                      {item.action}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="shadow-card">
          <PanelHeader
            title="Location utilisation"
            description="Capacity across the yard"
            actions={<PanelLink href="/location-occupancy">Board</PanelLink>}
          />
          {isLoading ? (
            <BarSkeleton rows={3} />
          ) : (
            <div className="flex flex-col gap-3">
              {[
                {
                  label: 'Occupied',
                  value: k?.occupied_locations ?? 0,
                  href: '/location-occupancy',
                  color: 'var(--color-chart-1)',
                },
                {
                  label: 'Available',
                  value: k?.empty_locations ?? 0,
                  href: '/location-occupancy?state=empty',
                  color: 'var(--color-chart-2)',
                },
                {
                  label: 'Blocked',
                  value: k?.blocked_locations ?? 0,
                  href: '/location-occupancy?state=blocked',
                  color: 'var(--color-signal-danger-fg)',
                },
              ].map((row) => (
                <Link
                  key={row.label}
                  href={row.href}
                  className="-mx-1.5 rounded-md px-1.5 py-1 hover:bg-graphite-50"
                >
                  <Meter
                    label={row.label}
                    value={row.value}
                    max={Math.max(totalLocations, 1)}
                    color={row.color}
                    suffix={
                      totalLocations > 0 ? `${Math.round((row.value / totalLocations) * 100)}%` : '—'
                    }
                  />
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Oldest awaiting dispatch                                          */}
      {/* ---------------------------------------------------------------- */}
      <Panel padded={false} className="overflow-hidden shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
          <div>
            <h3 className="text-h3 text-graphite-800">Oldest awaiting dispatch</h3>
            <p className="mt-0.5 text-caption text-graphite-500">
              Longest-standing stock still in the yard
            </p>
          </div>
          <PanelLink href="/inventory?sort=ageing_days&dir=desc">View all</PanelLink>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2 px-5 pb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (data?.oldest_awaiting_dispatch ?? []).length === 0 ? (
          <div className="border-t border-graphite-200">
            <EmptyState compact variant="no-data" title="No stored pallets yet" headingLevel={4} />
          </div>
        ) : (
          <ul className="divide-y divide-graphite-200 border-t border-graphite-200">
            {data!.oldest_awaiting_dispatch.map((row) => (
              <li key={row.pallet_id}>
                <Link
                  href={`/pallets/${row.pallet_id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors duration-fast hover:bg-graphite-25"
                >
                  <div className="min-w-[10rem] flex-1">
                    <PalletIdentity
                      pallet={{
                        id: row.pallet_id,
                        palletNumber: row.pallet_number ?? '—',
                        jobNumber: row.job_number,
                        customerName: row.customer_name,
                        status: statusKeyOf(row.display_status),
                      }}
                      variant="stacked"
                      showStatus={false}
                    />
                  </div>
                  <LocationRef
                    location={{
                      id: row.location_id,
                      code: row.location_code ?? '—',
                      facilityName: row.facility_name,
                      zoneName: row.zone_name,
                    }}
                    showState={false}
                  />
                  <AgeingIndicator days={row.ageing_days} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ---------------------------------------------------------------- */}
      {/* Quick actions                                                     */}
      {/* ---------------------------------------------------------------- */}
      <nav aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: '/transactions/put-away',
            label: 'Put-away',
            hint: 'Bring a pallet into stock',
            icon: Package,
          },
          {
            href: '/transactions/movement',
            label: 'Movement',
            hint: 'Relocate a pallet',
            icon: ArrowRightLeft,
          },
          {
            href: '/transactions/dispatch',
            label: 'Dispatch',
            hint: 'Release stock from the yard',
            icon: Truck,
          },
          {
            href: '/location-occupancy',
            label: 'Occupancy board',
            hint: 'See the physical layout',
            icon: Grid3x3,
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'card-interactive group flex items-center gap-3 rounded-xl border border-graphite-200',
              'bg-graphite-0 p-4 shadow-card hover:border-anodic-300',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                'bg-anodic-50 text-anodic-600 transition-colors duration-fast',
                'group-hover:bg-anodic-100',
              )}
            >
              <action.icon className="size-[1.125rem]" />
            </span>
            <span className="min-w-0">
              <span className="block text-body-sm font-medium text-graphite-900">
                {action.label}
              </span>
              <span className="block truncate text-caption text-graphite-500">{action.hint}</span>
            </span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

/* ------------------------------------------------------------------ bits */

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-body-sm text-anodic-600 underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  )
}

function share(part: number | undefined, whole: number | undefined): string {
  if (!part || !whole) return '—'
  return `${Math.round((part / whole) * 100)}% of active stock`
}

const FACILITY_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
]

function facilitySlices(data: DashboardResponse): DonutSlice[] {
  return data.by_facility.map((row, index) => ({
    label: row.name,
    value: Number(row.total),
    color: FACILITY_COLORS[index % FACILITY_COLORS.length]!,
  }))
}

/**
 * Status slices reuse the status dot colours, so a segment here and a badge in
 * a table are the same colour for the same status (docs/21 §2.4).
 */
function statusSlices(data: DashboardResponse): DonutSlice[] {
  return data.by_status.map((row) => {
    const key = statusKeyOf(row.status)
    return {
      label: row.status,
      value: Number(row.total),
      color: `var(--color-status-${key}-dot)`,
    }
  })
}

function ageingRows(data: DashboardResponse | undefined) {
  return [
    {
      label: '0–7 days',
      value: data?.ageing.fresh ?? 0,
      href: '/inventory?ageing=fresh',
      color: 'var(--color-ageing-fresh)',
    },
    {
      label: '8–15 days',
      value: data?.ageing.normal ?? 0,
      href: '/inventory?ageing=normal',
      color: 'var(--color-ageing-normal)',
    },
    {
      label: '16–30 days',
      value: data?.ageing.attention ?? 0,
      href: '/inventory?ageing=attention',
      color: 'var(--color-ageing-attention)',
    },
    {
      label: 'Over 30 days',
      value: data?.ageing.critical ?? 0,
      href: '/inventory?ageing=critical',
      color: 'var(--color-ageing-critical)',
    },
  ]
}

type AttentionItem = {
  href: string
  title: string
  detail: string
  severity: string
  action: string
  tone: 'danger' | 'warning'
  icon: ReactNode
}

/**
 * The attention list is ordered by what stops work: a held pallet cannot be
 * dispatched at all, a blocked location cannot receive, ageing is a cost.
 */
function buildAttention(data: DashboardResponse | undefined): AttentionItem[] {
  const k = data?.kpis
  if (!k) return []

  const items: AttentionItem[] = []

  if (k.holds_exceptions > 0) {
    items.push({
      href: '/holds-exceptions',
      title: `${formatNumber(k.holds_exceptions)} pallet${k.holds_exceptions === 1 ? '' : 's'} on hold or in exception`,
      detail: 'Cannot be dispatched until a supervisor releases the hold',
      severity: 'Critical',
      action: 'Review holds',
      tone: 'danger',
      icon: <TriangleAlert className="size-4" />,
    })
  }

  if (k.blocked_locations > 0) {
    items.push({
      href: '/location-occupancy?state=blocked',
      title: `${formatNumber(k.blocked_locations)} location${k.blocked_locations === 1 ? '' : 's'} blocked`,
      detail: 'Put-away and movement into these locations is refused',
      severity: 'Blocked',
      action: 'View locations',
      tone: 'warning',
      icon: <Ban className="size-4" />,
    })
  }

  if (k.ageing_over_threshold > 0) {
    items.push({
      href: '/inventory?ageing=critical',
      title: `${formatNumber(k.ageing_over_threshold)} pallet${k.ageing_over_threshold === 1 ? '' : 's'} past the ageing threshold`,
      detail: 'Standing longer than the configured limit (CFG-07)',
      severity: 'Warning',
      action: 'View stock',
      tone: 'warning',
      icon: <Hourglass className="size-4" />,
    })
  }

  return items
}

function DonutSkeleton() {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <Skeleton className="size-[150px] shrink-0 rounded-full" />
      <div className="flex w-full flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}

function BarSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}
