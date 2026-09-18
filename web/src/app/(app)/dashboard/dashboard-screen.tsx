'use client'

import {
  ArrowRightLeft,
  Ban,
  Boxes,
  ChevronRight,
  Clock,
  Gauge,
  Grid3x3,
  Hourglass,
  LayoutDashboard,
  Package,
  RefreshCw,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { AgeingIndicator } from '@/components/domain/ageing-indicator'
import { LocationRef } from '@/components/domain/location-ref'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { StatusBadge } from '@/components/domain/status-badge'
import { TransactionRef } from '@/components/domain/transaction-ref'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Badge,
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
import type { DashboardResponse, TransactionRow } from '@/lib/api/inventory-types'
import { statusKeyOf } from '@/lib/api/inventory-types'
import { cn } from '@/lib/cn'
import { formatDateTime, formatNumber, formatRelative, formatTime } from '@/lib/format'

/**
 * W-01 Operational Dashboard (docs/23 §3).
 *
 * Composition answers five questions in order: what is happening (updated time),
 * how much stock exists (KPI strip), today's throughput (stat strip), where it
 * is (distribution + utilisation), what needs attention (intelligence row) and
 * what happened recently (append-only ledger). Every number comes from the
 * dashboard API; no trend, delta or telemetry is synthesised on the client.
 */
export function DashboardScreen() {
  const router = useRouter()
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useApi<DashboardResponse>(
    ['dashboard'],
    '/api/proxy/dashboard',
  )

  // The append-only ledger, newest first — real data, fixed 8-row window.
  const activity = useApi<TransactionRow[]>(
    ['dashboard-activity'],
    '/api/proxy/transactions?page=1&pageSize=8',
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
      {/* ---------------------------------------------------------------- */}
      {/* Header — what am I looking at, and how fresh is it               */}
      {/* ---------------------------------------------------------------- */}
      <PageHeader
        icon={<LayoutDashboard className="size-5" />}
        title="Operational overview"
        context="Live yard and warehouse state"
        meta={
          <span className="inline-flex items-center gap-1.5 text-caption text-graphite-500">
            <Clock className="size-3.5 text-graphite-400" aria-hidden />
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
      {/* Quick actions — the primary workflow, one step from anywhere      */}
      {/* ---------------------------------------------------------------- */}
      <nav aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: '/transactions/put-away',
            label: 'Put-away',
            hint: 'Scan and store incoming pallets',
            icon: Package,
            iconClass: 'bg-signal-success-surface text-signal-success-fg',
          },
          {
            href: '/transactions/movement',
            label: 'Internal move',
            hint: 'Relocate a pallet between locations',
            icon: ArrowRightLeft,
            iconClass: 'bg-anodic-50 text-anodic-600',
          },
          {
            href: '/transactions/dispatch',
            label: 'Verified dispatch',
            hint: 'Release verified stock from the yard',
            icon: Truck,
            iconClass: 'bg-signal-info-surface text-signal-info-fg',
          },
          {
            href: '/location-occupancy',
            label: 'Occupancy board',
            hint: 'Live digital twin of yard & warehouse',
            icon: Grid3x3,
            iconClass: 'bg-graphite-100 text-graphite-700',
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="card-interactive group relative flex items-center gap-3 rounded-lg border border-graphite-200 bg-graphite-0 p-4 hover:border-anodic-300"
          >
            <span
              aria-hidden
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                action.iconClass,
              )}
            >
              <action.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-body font-semibold text-graphite-900">
                {action.label}
              </span>
              <span className="block truncate text-caption text-graphite-500">{action.hint}</span>
            </span>
            <ChevronRight
              aria-hidden
              className="ml-auto size-4 shrink-0 text-graphite-300 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:text-anodic-600"
            />
          </Link>
        ))}
      </nav>

      {/* ---------------------------------------------------------------- */}
      {/* Primary KPI strip — how much stock exists                         */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Primary metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)
            ) : (
          <>
            <KpiCard
              label="Active pallets"
              value={k?.total_active ?? 0}
              tone="primary"
              icon={<Boxes className="size-4" />}
              footer="Currently stored in yard & warehouse"
              onClick={go('/inventory')}
            />
            <KpiCard
              label="Past ageing threshold"
              value={k?.ageing_over_threshold ?? 0}
              tone={(k?.ageing_over_threshold ?? 0) > 0 ? 'warning' : 'neutral'}
              icon={<Hourglass className="size-4" />}
              footer="Standing longer than the configured limit (CFG-07)"
              onClick={go('/inventory?ageing=critical')}
            />
            <KpiCard
              label="Location utilisation"
              value={`${utilisation}%`}
              tone={utilisation >= 90 ? 'warning' : 'primary'}
              icon={<Gauge className="size-4" />}
              visual={
                <div className="flex w-full flex-col gap-1.5">
                  <div className="flex justify-between text-caption tabular-nums text-graphite-500">
                    <span>{formatNumber(k?.occupied_locations ?? 0)} occupied</span>
                    <span>{formatNumber(k?.empty_locations ?? 0)} available</span>
                  </div>
                  <span
                    aria-hidden
                    className="block h-2 w-full overflow-hidden rounded-full bg-graphite-100"
                  >
                    <span
                      className={cn(
                        'anim-meter block h-full rounded-full transition-all duration-slow',
                        utilisation >= 90 ? 'bg-signal-warning-fg' : 'bg-anodic-500',
                      )}
                      style={{ width: `${utilisation}%` }}
                    />
                  </span>
                </div>
              }
              footer={`${formatNumber(k?.occupied_locations ?? 0)} of ${formatNumber(totalLocations)} locations in use`}
              onClick={go('/location-occupancy')}
            />
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Today's operations — compact supporting metrics                   */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Today's operations">
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : (
          <div className="grid gap-px overflow-hidden rounded-lg border border-graphite-200 bg-graphite-200 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: '/transactions?type=PUTAWAY',
                label: 'Put-away today',
                value: k?.today_putaway ?? 0,
                footer: 'Brought in from the collection point',
              },
              {
                href: '/transactions?type=TRANSFER',
                label: 'Transfers today',
                value: k?.today_transfers ?? 0,
                footer: 'Internal relocations & aisle moves',
              },
              {
                href: '/transactions?type=DISPATCH',
                label: 'Dispatched today',
                value: k?.today_dispatch ?? 0,
                footer: 'Released from the yard & verified',
              },
              {
                href: '/holds-exceptions',
                label: 'Holds & exceptions',
                value: k?.holds_exceptions ?? 0,
                footer: k?.holds_exceptions
                  ? 'Pallets blocked from dispatch'
                  : 'Zero active holds',
                danger: (k?.holds_exceptions ?? 0) > 0,
              },
            ].map((cell) => (
              <Link
                key={cell.label}
                href={cell.href}
                className="group relative bg-graphite-0 p-4 transition-colors duration-fast ease-standard hover:bg-anodic-50/40"
                aria-label={`${cell.label}: ${cell.value}`}
              >
                <p className="text-overline uppercase tracking-wider text-graphite-500">
                  {cell.label}
                </p>
                <p
                  className={cn(
                    'mt-1.5 text-h2 tabular-nums',
                    cell.danger ? 'text-signal-danger-fg' : 'text-graphite-900',
                  )}
                >
                  {formatNumber(cell.value)}
                </p>
                <p className="text-caption text-graphite-500">{cell.footer}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Where the stock is, and what state it is in                       */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Distribution" className="grid gap-4 lg:grid-cols-3">
        <Panel>
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
              <Donut slices={facilitySlices(data!)} caption="pallets" />
              <DonutLegend slices={facilitySlices(data!)} />
            </div>
          )}
        </Panel>

        <Panel>
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
              <Donut slices={statusSlices(data!)} caption="pallets" />
              <DonutLegend
                slices={statusSlices(data!)}
                renderLabel={(slice) => <StatusBadge status={statusKeyOf(slice.label)} />}
              />
            </div>
          )}
        </Panel>

        <Panel>
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
      {/* Operational intelligence — what needs attention, how long stock    */}
      {/* has been standing                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Attention" className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel padded={false} className="overflow-hidden">
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
            <div className="flex flex-col gap-2.5 p-4 pt-1">
              {attention.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center justify-between gap-3.5 rounded-lg border p-3.5 transition-colors duration-fast',
                    item.tone === 'danger'
                      ? 'border-signal-danger-border hover:border-signal-danger-fg/40'
                      : 'border-signal-warning-border hover:border-signal-warning-fg/40',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg',
                      item.tone === 'danger'
                        ? 'bg-signal-danger-surface text-signal-danger-fg'
                        : 'bg-signal-warning-surface text-signal-warning-fg',
                    )}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-body-sm font-medium text-graphite-900">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-caption text-graphite-500">
                      {item.detail}
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-body-sm text-anodic-600 transition-colors group-hover:text-anodic-700">
                    {item.action}
                    <ChevronRight className="size-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
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
      {/* Recent activity + oldest awaiting dispatch                        */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Activity" className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel padded={false} className="overflow-hidden shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
            <div>
              <h3 className="text-h3 text-graphite-800">Recent activity</h3>
              <p className="mt-0.5 text-caption text-graphite-500">
                Latest transactions from the append-only ledger
              </p>
            </div>
            <PanelLink href="/transactions">View all</PanelLink>
          </div>

          {activity.isLoading ? (
            <div className="flex flex-col gap-2 px-5 pb-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : activity.error ? (
            <div className="border-t border-graphite-200">
              <EmptyState
                compact
                variant="error"
                headingLevel={4}
                title="Could not load recent activity"
                description={activity.error.message}
                action={
                  <Button variant="secondary" size="sm" onClick={() => void activity.refetch()}>
                    Retry
                  </Button>
                }
              />
            </div>
          ) : (activity.data ?? []).length === 0 ? (
            <div className="border-t border-graphite-200">
              <EmptyState
                compact
                variant="no-data"
                headingLevel={4}
                title="No transactions yet"
                description="Transactions appear here as soon as the first pallet is put away."
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5 border-t border-graphite-200 p-2">
              {/* Ledger rows — quiet chrome, precise data */}
              {activity.data!.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/pallets/${row.pallet_id}`}
                    className="group -mx-1 flex items-center gap-3 rounded-md px-1.5 py-2 transition-colors duration-fast hover:bg-graphite-25"
                  >
                    <span
                      title={formatDateTime(row.created_at)}
                      className="w-16 shrink-0 text-caption tabular-nums text-graphite-500"
                    >
                      {formatRelative(row.created_at)}
                    </span>
                    <TransactionRef reference={row.txn_ref} copyable={false} />
                    <Badge tone="outline">{row.type}</Badge>
                    <span className="min-w-0 flex-1 truncate font-mono text-mono text-graphite-700">
                      {row.pallet_number ?? '—'}
                    </span>
                    <span className="hidden shrink-0 font-mono text-mono text-graphite-600 lg:block">
                      {row.source_location_code ?? '—'}{' '}
                      <span className="text-graphite-400">→</span>{' '}
                      <span className="text-anodic-700">{row.destination_location_code ?? '—'}</span>
                    </span>
                    <span className="hidden w-28 shrink-0 truncate text-right text-caption text-graphite-500 lg:block">
                      {row.user_name ?? '—'}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-graphite-300 transition-colors duration-fast group-hover:text-anodic-600"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

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
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (data?.oldest_awaiting_dispatch ?? []).length === 0 ? (
            <div className="border-t border-graphite-200">
              <EmptyState compact variant="no-data" title="No stored pallets yet" headingLevel={4} />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 p-4 pt-1">
              {data!.oldest_awaiting_dispatch.map((row) => (
                <Link
                  key={row.pallet_id}
                  href={`/pallets/${row.pallet_id}`}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-graphite-200/80 bg-graphite-25 p-3.5 transition-colors duration-fast hover:border-anodic-300 hover:bg-graphite-0"
                >
                  <div className="min-w-[12rem] flex-1">
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
                  <div className="flex items-center gap-2">
                    <AgeingIndicator days={row.ageing_days} />
                    <ChevronRight
                      aria-hidden
                      className="size-4 text-graphite-300 transition-colors duration-fast group-hover:text-anodic-600"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </section>
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
      <Skeleton className="size-[168px] shrink-0 rounded-full" />
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
