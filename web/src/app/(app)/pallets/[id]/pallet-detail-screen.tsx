'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { AgeingIndicator } from '@/components/domain/ageing-indicator'
import { LocationRef } from '@/components/domain/location-ref'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { PermissionGate } from '@/components/domain/permission-gate'
import { StatusBadge } from '@/components/domain/status-badge'
import { Timeline } from '@/components/domain/timeline'
import { TransactionRef } from '@/components/domain/transaction-ref'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Button,
  EmptyState,
  Panel,
  PanelHeader,
  Skeleton,
  StatPanel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
} from '@/components/ui'
import { HoldDialog } from '@/features/holds/hold-dialog'
import { useApi } from '@/features/shared/use-api'
import { statusKeyOf, type HoldRow, type PalletDetail, type TransactionRow } from '@/lib/api/inventory-types'
import { formatDateTime } from '@/lib/format'

type HistoryResponse = { pallet: PalletDetail; timeline: TransactionRow[]; holds: HoldRow[] }

/** W-03 Pallet Detail (docs/23 §5). */
export function PalletDetailScreen({ id }: { id: string }) {
  const router = useRouter()
  const [holdOpen, setHoldOpen] = useState(false)

  const { data, isLoading, error, refetch } = useApi<HistoryResponse>(
    ['pallet', id],
    `/api/proxy/pallets/${id}/history`,
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Panel>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-3 h-4 w-72" />
        </Panel>
        <Panel>
          <Skeleton className="h-40 w-full" />
        </Panel>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Panel padded={false}>
        <EmptyState
          variant="error"
          title="Could not load this pallet"
          description={error?.message}
          errorCode={error?.code}
          traceId={error?.traceId}
          action={
            <Button variant="primary" onClick={() => void refetch()}>
              Retry
            </Button>
          }
          secondaryAction={
            <Button variant="secondary" onClick={() => router.push('/inventory')}>
              Back to inventory
            </Button>
          }
        />
      </Panel>
    )
  }

  const { pallet, timeline, holds } = data
  const openHold = holds.find((h) => h.is_open)
  const dispatched = pallet.display_status === 'DISPATCHED'

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={pallet.pallet_number ?? pallet.pallet_key}
        context={[pallet.job_number, pallet.customer_name, pallet.lpo_number].filter(Boolean).join(' · ') || 'No job details recorded'}
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: pallet.pallet_number ?? 'Pallet' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" leftIcon={<ArrowLeft className="size-4" />} asChild>
              <Link href="/inventory">Back</Link>
            </Button>
            <PermissionGate permission="transfer.perform">
              <Tooltip content={dispatched ? 'Dispatched pallets cannot be moved' : ''}>
                <span className="inline-block">
                  <Button
                    variant="secondary"
                    disabled={dispatched}
                    onClick={() => router.push(`/transactions/movement?pallet=${pallet.pallet_number ?? ''}`)}
                  >
                    Move
                  </Button>
                </span>
              </Tooltip>
            </PermissionGate>
            <PermissionGate permission="dispatch.perform">
              <Tooltip
                content={
                  dispatched
                    ? 'Already dispatched'
                    : openHold
                      ? `On hold — ${openHold.reason ?? 'no reason recorded'}`
                      : ''
                }
              >
                <span className="inline-block">
                  <Button
                    variant="primary"
                    disabled={dispatched || Boolean(openHold)}
                    onClick={() => router.push(`/transactions/dispatch?pallet=${pallet.pallet_number ?? ''}`)}
                  >
                    Dispatch
                  </Button>
                </span>
              </Tooltip>
            </PermissionGate>
            <PermissionGate permission="hold.create">
              {!openHold && !dispatched ? (
                <Button variant="secondary" onClick={() => setHoldOpen(true)}>
                  Place hold
                </Button>
              ) : null}
            </PermissionGate>
          </div>
        }
      />

      {openHold ? (
        <Alert tone="warning" title={`This pallet is ${openHold.hold_type.toLowerCase()} and cannot be dispatched`}>
          {[openHold.reason, openHold.remarks].filter(Boolean).join(' — ')} · placed by{' '}
          {openHold.placed_by ?? 'unknown'} on {formatDateTime(openHold.placed_at)}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Pallet identity" />
          <PalletIdentity
            pallet={{
              id: pallet.id,
              palletNumber: pallet.pallet_number ?? pallet.pallet_key,
              jobNumber: pallet.job_number,
              customerName: pallet.customer_name,
              lpoNumber: pallet.lpo_number,
              status: statusKeyOf(pallet.display_status),
            }}
            variant="hero"
          />
          <StatPanel
            className="mt-4"
            stats={[
              { label: 'Job number', value: pallet.job_number ?? '—', mono: Boolean(pallet.job_number) },
              { label: 'Customer', value: pallet.customer_name ?? 'Not recorded' },
              { label: 'LPO', value: pallet.lpo_number ?? '—', mono: Boolean(pallet.lpo_number) },
              { label: 'Scanned barcode', value: pallet.raw_barcode_value, mono: true },
              { label: 'Barcode profile', value: pallet.barcode_profile },
              { label: 'Status', value: <StatusBadge status={statusKeyOf(pallet.display_status)} /> },
            ]}
          />
        </Panel>

        <Panel>
          <PanelHeader title={dispatched ? 'Dispatch' : 'Current location'} />
          {dispatched ? (
            <StatPanel
              columns={1}
              stats={[
                { label: 'Dispatched at', value: formatDateTime(pallet.dispatched_at) },
                { label: 'Status', value: <StatusBadge status="dispatched" /> },
                { label: 'Note', value: 'This pallet has left active inventory. Its full history is below.' },
              ]}
            />
          ) : pallet.location ? (
            <>
              <LocationRef
                location={{
                  id: pallet.location.id,
                  code: pallet.location.code ?? '—',
                  facilityName: pallet.location.facility_name,
                  zoneName: pallet.location.zone_name,
                  state: 'occupied',
                }}
                variant="hero"
              />
              <StatPanel
                className="mt-4"
                stats={[
                  { label: 'Put away', value: formatDateTime(pallet.location.putaway_at) },
                  { label: 'At this location since', value: formatDateTime(pallet.location.stored_at) },
                  { label: 'Ageing', value: <AgeingIndicator days={pallet.ageing_days} /> },
                  { label: 'Last movement', value: formatDateTime(pallet.last_movement_at) },
                ]}
              />
              <Button variant="secondary" className="mt-4" asChild>
                <Link href={`/locations/${pallet.location.id}`}>View location</Link>
              </Button>
            </>
          ) : (
            <EmptyState
              compact
              headingLevel={3}
              variant="no-data"
              title="Not currently stored"
              description="This pallet has no active location."
            />
          )}
        </Panel>
      </div>

      <Panel>
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline" count={timeline.length}>
              Timeline
            </TabsTrigger>
            <TabsTrigger value="holds" count={holds.length}>
              Holds
            </TabsTrigger>
            <TabsTrigger value="transactions" count={timeline.length}>
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <Timeline events={timeline} />
          </TabsContent>

          <TabsContent value="holds">
            {holds.length === 0 ? (
              <p className="text-body-sm text-graphite-500">This pallet has never been held.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {holds.map((hold) => (
                  <li key={hold.id} className="rounded-lg border border-graphite-200 p-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <StatusBadge status={statusKeyOf(hold.hold_type === 'HOLD' ? 'ON_HOLD' : hold.hold_type)} />
                      <span className="text-caption text-graphite-500">
                        {formatDateTime(hold.placed_at)} · {hold.placed_by}
                      </span>
                      {hold.is_open ? null : (
                        <span className="text-caption text-signal-success-fg">
                          Released {formatDateTime(hold.released_at)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-body-sm text-graphite-700">
                      {[hold.reason, hold.remarks].filter(Boolean).join(' — ') || 'No reason recorded'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <caption className="sr-only">All transactions for this pallet</caption>
                <thead className="bg-graphite-50">
                  <tr className="border-b border-graphite-200">
                    {['Reference', 'Type', 'From', 'To', 'User', 'Channel', 'When'].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 text-left text-overline uppercase text-graphite-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((t) => (
                    <tr key={t.id} className="border-b border-graphite-200 last:border-0">
                      <td className="px-3 py-1.5">
                        <TransactionRef reference={t.txn_ref} copyable={false} />
                      </td>
                      <td className="px-3 py-1.5 text-graphite-700">{t.type}</td>
                      <td className="px-3 py-1.5 font-mono text-mono">{t.source_location_code ?? '—'}</td>
                      <td className="px-3 py-1.5 font-mono text-mono">{t.destination_location_code ?? '—'}</td>
                      <td className="px-3 py-1.5 text-graphite-600">{t.user_name ?? '—'}</td>
                      <td className="px-3 py-1.5 text-graphite-500">{t.channel}</td>
                      <td className="px-3 py-1.5 text-graphite-600">{formatDateTime(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </Panel>

      <HoldDialog
        open={holdOpen}
        palletId={pallet.id}
        palletNumber={pallet.pallet_number ?? pallet.pallet_key}
        onClose={() => setHoldOpen(false)}
        onDone={() => void refetch()}
      />
    </div>
  )
}
