'use client'

import { ArrowLeft, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { AgeingIndicator } from '@/components/domain/ageing-indicator'
import { LocationRef } from '@/components/domain/location-ref'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { PermissionGate } from '@/components/domain/permission-gate'
import { StatusBadge } from '@/components/domain/status-badge'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Button,
  EmptyState,
  Panel,
  PanelHeader,
  Skeleton,
  StatPanel,
} from '@/components/ui'
import { BlockLocationDialog } from '@/app/(app)/masters/locations/block-dialog'
import { useApi, useApiMutation } from '@/features/shared/use-api'
import type { InventoryRow } from '@/lib/api/inventory-types'
import { statusKeyOf } from '@/lib/api/inventory-types'
import type { BarcodeRow } from '@/lib/api/inventory-types'
import type { LocationRecord } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'

type AtLocation = {
  location: {
    id: string
    code: string
    facility_name: string | null
    zone_name: string | null
    capacity: number | null
    is_blocked: boolean
    is_active: boolean
  }
  pallets: InventoryRow[]
}

/** W-05 Location Detail (docs/23 §10). */
export function LocationDetailScreen({ id }: { id: string }) {
  const router = useRouter()
  const [blocking, setBlocking] = useState(false)

  const contents = useApi<AtLocation>(['location-contents', id], `/api/proxy/inventory/location/${id}`)
  const record = useApi<LocationRecord>(['location', id], `/api/proxy/locations/${id}`)
  const barcodes = useApi<{ items: BarcodeRow[] } | BarcodeRow[]>(
    ['location-barcode', id],
    `/api/proxy/location-barcodes?search=${encodeURIComponent(record.data?.code ?? '')}`,
    Boolean(record.data?.code),
  )

  const unblock = useApiMutation<void, unknown>(
    () => ({ path: `/api/proxy/locations/${id}/unblock` }),
    ['location', 'location-contents', 'occupancy', 'locations'],
  )

  const generate = useApiMutation<void, unknown>(
    () => ({ path: `/api/proxy/location-barcodes/${id}/generate` }),
    ['location-barcode'],
  )

  if (contents.isLoading || record.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        <Panel className="shadow-card">
          <Skeleton className="h-24 w-full" />
        </Panel>
      </div>
    )
  }

  if (contents.error || !contents.data) {
    return (
      <Panel padded={false} className="shadow-card">
        <EmptyState
          variant="error"
          title="Could not load this location"
          description={contents.error?.message}
          errorCode={contents.error?.code}
          action={
            <Button variant="primary" onClick={() => void contents.refetch()}>
              Retry
            </Button>
          }
        />
      </Panel>
    )
  }

  const { location, pallets } = contents.data
  const barcodeList = Array.isArray(barcodes.data) ? barcodes.data : (barcodes.data?.items ?? [])
  const barcode = barcodeList.find((b) => b.location_id === id) ?? barcodeList[0]

  const state = !location.is_active ? 'inactive' : location.is_blocked ? 'blocked' : pallets.length ? 'occupied' : 'empty'

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        icon={<MapPin className="size-5" />}
        title={location.code}
        context={[location.facility_name, location.zone_name].filter(Boolean).join(' › ')}
        breadcrumbs={[
          { label: 'Inventory' },
          { label: 'Occupancy', href: '/location-occupancy' },
          { label: location.code },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" leftIcon={<ArrowLeft className="size-4" />} asChild>
              <Link href="/location-occupancy">Back</Link>
            </Button>
            <PermissionGate permission="location.block">
              {location.is_blocked ? (
                <Button variant="secondary" loading={unblock.isPending} onClick={() => unblock.mutate()}>
                  Unblock
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setBlocking(true)}>
                  Block
                </Button>
              )}
            </PermissionGate>
            <PermissionGate permission="barcode.print">
              <Button variant="secondary" asChild>
                <Link href={`/masters/location-barcodes?search=${encodeURIComponent(location.code)}`}>
                  Barcode
                </Link>
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {location.is_blocked ? (
        <Alert tone="warning" title="This location is blocked">
          {record.data?.blocked_reason ?? 'No reason recorded'}
          {record.data?.blocked_remarks ? ` — ${record.data.blocked_remarks}` : ''}. Stock already here
          is unaffected; new put-away and transfers in are refused.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="shadow-card">
          <PanelHeader title="Location" />
          <LocationRef
            location={{
              id: location.id,
              code: location.code,
              facilityName: location.facility_name,
              zoneName: location.zone_name,
              state,
              palletCount: pallets.length,
              capacity: location.capacity,
            }}
            variant="hero"
          />
          <StatPanel
            className="mt-4"
            stats={[
              { label: 'Facility', value: location.facility_name ?? '—' },
              { label: 'Zone', value: location.zone_name ?? 'No zone' },
              { label: 'Type', value: record.data?.location_type ?? '—' },
              { label: 'Capacity', value: location.capacity ?? 'Not defined' },
              { label: 'Occupancy', value: `${pallets.length} pallet${pallets.length === 1 ? '' : 's'}` },
              { label: 'State', value: state },
            ]}
          />
        </Panel>

        <Panel className="shadow-card">
          <PanelHeader
            title="Barcode"
            description="Identity is permanent. A reprint reproduces the same value."
          />
          {barcode ? (
            <StatPanel
              columns={1}
              stats={[
                { label: 'Barcode value', value: barcode.barcode_value, mono: true },
                { label: 'Symbology', value: barcode.symbology },
                { label: 'Source', value: barcode.source.replace('_', ' ').toLowerCase() },
                { label: 'Last printed', value: formatDateTime(barcode.last_printed_at) },
                { label: 'Reprints', value: barcode.reprint_count },
              ]}
            />
          ) : (
            <EmptyState
              compact
              headingLevel={3}
              variant="not-started"
              title="No barcode generated yet"
              description="Generate an identity for this location before labelling it."
              action={
                <PermissionGate permission="barcode.print">
                  <Button variant="primary" loading={generate.isPending} onClick={() => generate.mutate()}>
                    Generate barcode
                  </Button>
                </PermissionGate>
              }
            />
          )}
        </Panel>
      </div>

      <Panel padded={false} className="shadow-card">
        <div className="p-5 pb-3">
          <PanelHeader
            title={`Pallets at this location (${pallets.length})`}
            className="mb-0"
          />
        </div>
        {pallets.length === 0 ? (
          <EmptyState
            headingLevel={2}
            variant="location-empty"
            title="This location is empty"
            description={`Nothing is currently recorded at ${location.code}.`}
            action={
              <Button variant="secondary" onClick={() => router.push('/location-occupancy')}>
                Find another location
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-graphite-200 border-t border-graphite-200">
            {pallets.map((row) => (
              <li key={row.pallet_id}>
                <Link
                  href={`/pallets/${row.pallet_id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-graphite-25"
                >
                  <PalletIdentity
                    pallet={{
                      id: row.pallet_id,
                      palletNumber: row.pallet_number ?? '—',
                      jobNumber: row.job_number,
                      customerName: row.customer_name,
                    }}
                    variant="stacked"
                    showStatus={false}
                  />
                  <StatusBadge status={statusKeyOf(row.display_status)} />
                  <span className="text-caption text-graphite-500">
                    Put away {formatDateTime(row.putaway_at)}
                  </span>
                  <AgeingIndicator days={row.ageing_days} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {record.data ? (
        <BlockLocationDialog
          location={blocking ? record.data : null}
          onClose={() => {
            setBlocking(false)
            void record.refetch()
            void contents.refetch()
          }}
        />
      ) : null}
    </div>
  )
}
