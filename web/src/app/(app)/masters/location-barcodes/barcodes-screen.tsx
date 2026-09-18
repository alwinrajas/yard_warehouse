'use client'

import { Printer } from 'lucide-react'
import { useState } from 'react'

import { PermissionGate } from '@/components/domain/permission-gate'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Button,
  ConfirmDialog,
  DataTable,
  DataTableToolbar,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Pagination,
  Panel,
  Select,
  type DataTableColumn,
} from '@/components/ui'
import { useFacilityLookup } from '@/features/masters/use-lookups'
import { useApiList, useApiMutation } from '@/features/shared/use-api'
import type { BarcodeRow } from '@/lib/api/inventory-types'
import { formatDateTime, formatNumber } from '@/lib/format'

/**
 * W-23b Location Barcode Management (docs/23 §10).
 *
 * There is no "regenerate" control, and the API has no such endpoint. A reprint
 * reproduces the same value — location identity is permanent (LB-03).
 */
export function BarcodesScreen() {
  const list = useApiList<BarcodeRow>('barcodes', '/api/proxy/location-barcodes', ['facility_id'])
  const facilities = useFacilityLookup()
  const [reprinting, setReprinting] = useState<BarcodeRow | null>(null)
  const [reason, setReason] = useState('')

  const reprint = useApiMutation<{ id: string; reason: string }, { identity_preserved: boolean }>(
    ({ id, reason: r }) => ({ path: `/api/proxy/location-barcodes/${id}/reprint`, body: { reason: r || null } }),
    ['barcodes'],
  )

  const generateMissing = useApiMutation<string, { generated: number }>(
    (facilityId) => ({
      path: '/api/proxy/location-barcodes/generate-missing',
      body: { facility_id: Number(facilityId) },
    }),
    ['barcodes'],
  )

  const columns: DataTableColumn<BarcodeRow>[] = [
    {
      id: 'location',
      header: 'Location',
      priority: 1,
      accessor: (r) => (
        <div className="min-w-0">
          <span className="block font-mono text-mono text-graphite-900">{r.location_code ?? '—'}</span>
          <span className="block truncate text-caption text-graphite-500">
            {[r.facility_name, r.zone_name].filter(Boolean).join(' › ')}
          </span>
        </div>
      ),
    },
    {
      id: 'value',
      header: 'Barcode value',
      priority: 1,
      accessor: (r) => <span className="font-mono text-mono text-graphite-900">{r.barcode_value}</span>,
    },
    { id: 'symbology', header: 'Symbology', priority: 3, accessor: (r) => r.symbology },
    { id: 'source', header: 'Source', priority: 3, accessor: (r) => r.source.replace('_', ' ').toLowerCase() },
    { id: 'printed', header: 'Last printed', priority: 2, accessor: (r) => formatDateTime(r.last_printed_at) },
    {
      id: 'reprints',
      header: 'Reprints',
      priority: 2,
      align: 'right',
      accessor: (r) => <span className="tabular-nums">{r.reprint_count}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Location Barcodes"
        context={`${formatNumber(list.pagination.total)} location identit${list.pagination.total === 1 ? 'y' : 'ies'}`}
        breadcrumbs={[{ label: 'Masters' }, { label: 'Location Barcodes' }]}
        actions={
          <PermissionGate permission="barcode.print">
            <Select
              ariaLabel="Generate missing for facility"
              placeholder="Generate missing…"
              onValueChange={(v) => generateMissing.mutate(v)}
              options={(facilities.data?.items ?? []).map((x) => ({ value: x.id, label: x.name }))}
              className="w-56"
            />
          </PermissionGate>
        }
      />

      <Alert tone="info" title="Location identity is permanent">
        This screen manages the barcodes ALU TRACK generates for storage locations. Pallet barcodes
        come from the customer&rsquo;s ERP and are never generated here. A reprint always reproduces
        the same value.
      </Alert>

      {generateMissing.data ? (
        <Alert tone="success" title={`${generateMissing.data.generated} barcode identities generated`} live />
      ) : null}

      <Panel padded={false} className="overflow-hidden shadow-card">
        <div className="flex flex-col gap-3 p-4">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search location or barcode value…"
          />
          <FilterBar
            activeFilters={Object.entries(list.filters).map(([id, value]) => ({ id, label: 'Facility', value }))}
            onRemoveFilter={(id) => list.setFilter(id, null)}
            onClearAll={list.clearFilters}
          >
            <Select
              ariaLabel="Facility"
              placeholder="All facilities"
              value={list.filters['facility_id'] ?? 'all'}
              onValueChange={(v) => list.setFilter('facility_id', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: 'All facilities' },
                ...(facilities.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })),
              ]}
              className="w-52"
            />
          </FilterBar>
        </div>

        <DataTable
          dataset="locations"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message } : null}
          onRetry={() => void list.refetch()}
          caption="Location barcodes"
          rowActions={(row) => (
            <PermissionGate permission="barcode.reprint">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Printer className="size-3.5" />}
                onClick={() => {
                  setReason('')
                  setReprinting(row)
                }}
              >
                Reprint
              </Button>
            </PermissionGate>
          )}
          emptyState={
            <EmptyState
              variant="no-data"
              title="No barcodes generated yet"
              description="Generate identities for a facility's locations before printing and affixing labels."
            />
          }
        />

        {list.pagination.total > 0 ? (
          <Pagination
            page={list.pagination.page}
            pageSize={list.pagination.pageSize}
            total={list.pagination.total}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        ) : null}
      </Panel>

      <ConfirmDialog
        open={reprinting !== null}
        onOpenChange={(open) => !open && setReprinting(null)}
        title={`Reprint the label for ${reprinting?.location_code ?? ''}?`}
        description="This reprints the same barcode value. The location identity will not change."
        confirmLabel="Reprint label"
        loading={reprint.isPending}
        onConfirm={() =>
          reprinting &&
          reprint.mutate({ id: reprinting.id, reason }, { onSettled: () => setReprinting(null) })
        }
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-graphite-200/80 bg-graphite-25 p-3">
            <p className="text-overline uppercase text-graphite-500">Barcode value</p>
            <p className="mt-1 font-mono text-mono-lg text-graphite-900">{reprinting?.barcode_value}</p>
            <p className="mt-1 text-caption text-graphite-500">
              Reprinted {reprinting?.reprint_count ?? 0} time
              {(reprinting?.reprint_count ?? 0) === 1 ? '' : 's'} previously.
            </p>
          </div>
          <Field label="Reason" description="Recorded in the audit trail.">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Label damaged" />
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  )
}
