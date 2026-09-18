'use client'

import { ClipboardCheck } from 'lucide-react'

import { useState } from 'react'

import { PermissionGate } from '@/components/domain/permission-gate'
import { ScanField } from '@/components/domain/scan-field'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  Drawer,
  EmptyState,
  Field,
  Pagination,
  Panel,
  Select,
  StatPanel,
  Textarea,
  type DataTableColumn,
} from '@/components/ui'
import { useApi, useApiList, useApiMutation } from '@/features/shared/use-api'
import type { StockVerificationRow } from '@/lib/api/inventory-types'
import { cn } from '@/lib/cn'
import { formatDateTime, formatNumber } from '@/lib/format'

const OUTCOME_TONE = {
  MATCHED: 'neutral',
  MISSING: 'danger',
  UNEXPECTED: 'warning',
} as const

/** W-15 / W-16 Stock Verification (docs/23 §10). */
export function VerificationScreen() {
  const list = useApiList<StockVerificationRow>('verifications', '/api/proxy/stock-verifications', ['status'])
  const [openId, setOpenId] = useState<string | null>(null)
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [locationId, setLocationId] = useState('')

  const detail = useApi<StockVerificationRow>(
    ['verification', openId ?? ''],
    `/api/proxy/stock-verifications/${openId}`,
    Boolean(openId),
  )

  const start = useApiMutation<string, StockVerificationRow>(
    (id) => ({ path: '/api/proxy/stock-verifications', body: { location_id: Number(id) } }),
    ['verifications'],
  )
  const scan = useApiMutation<{ id: string; barcode: string }, unknown>(
    ({ id, barcode }) => ({ path: `/api/proxy/stock-verifications/${id}/scan`, body: { pallet_barcode: barcode } }),
    ['verification', 'verifications'],
  )
  const submit = useApiMutation<string, unknown>(
    (id) => ({ path: `/api/proxy/stock-verifications/${id}/submit` }),
    ['verification', 'verifications'],
  )
  const review = useApiMutation<{ id: string; approve: boolean; remarks: string }, unknown>(
    ({ id, approve, remarks }) => ({
      path: `/api/proxy/stock-verifications/${id}/review`,
      body: { approve, remarks: remarks || null },
    }),
    ['verification', 'verifications'],
  )

  const columns: DataTableColumn<StockVerificationRow>[] = [
    { id: 'ref', header: 'Reference', priority: 1, accessor: (r) => <span className="font-mono text-mono">{r.reference}</span> },
    { id: 'location', header: 'Location', priority: 1, accessor: (r) => <span className="font-mono text-mono">{r.location_code ?? '—'}</span> },
    {
      id: 'status',
      header: 'Status',
      priority: 1,
      accessor: (r) => (
        <Badge tone={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'danger' : r.status === 'SUBMITTED' ? 'info' : 'outline'}>
          {r.status}
        </Badge>
      ),
    },
    { id: 'expected', header: 'Expected', priority: 2, align: 'right', accessor: (r) => <span className="tabular-nums">{r.expected_count}</span> },
    { id: 'scanned', header: 'Scanned', priority: 2, align: 'right', accessor: (r) => <span className="tabular-nums">{r.scanned_count}</span> },
    {
      id: 'variance',
      header: 'Variance',
      priority: 1,
      align: 'right',
      accessor: (r) => (
        <span className={cn('tabular-nums', r.variance > 0 ? 'text-signal-warning-fg' : 'text-graphite-500')}>
          {r.variance}
        </span>
      ),
    },
    { id: 'started', header: 'Started', priority: 3, accessor: (r) => formatDateTime(r.started_at) },
  ]

  const session = detail.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<ClipboardCheck className="size-5" />}
        title="Stock Verification"
        context={`${formatNumber(list.pagination.total)} count${list.pagination.total === 1 ? '' : 's'} — expected against physically scanned`}
        breadcrumbs={[{ label: 'Operations' }, { label: 'Stock Verification' }]}
        actions={
          <PermissionGate permission="stockverify.create">
            <div className="flex items-center gap-2">
              <input
                aria-label="Location ID to count"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="Location ID"
                className="h-9 w-32 rounded-md border border-graphite-300 px-2.5 font-mono text-mono outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400"
              />
              <Button
                variant="primary"
                loading={start.isPending}
                disabled={!locationId}
                onClick={() =>
                  start.mutate(locationId, {
                    onSuccess: (created) => {
                      setOpenId(created.id)
                      setLocationId('')
                    },
                  })
                }
              >
                Start count
              </Button>
            </div>
          </PermissionGate>
        }
      />

      <Alert tone="info" title="A count is evidence, not authority">
        Submitting a count never rewrites inventory, and approving it does not silently move stock.
        Each correction is raised explicitly, with its own reason.
      </Alert>

      {start.error ? <Alert tone="danger" title={start.error.message} live /> : null}

      <Panel padded={false} className="overflow-hidden shadow-card">
        <div className="flex flex-col gap-3 p-4">
          <DataTableToolbar searchValue={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search…" />
          <Select
            ariaLabel="Status"
            placeholder="All statuses"
            value={list.filters['status'] ?? 'all'}
            onValueChange={(v) => list.setFilter('status', v === 'all' ? null : v)}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'DRAFT', label: 'In progress' },
              { value: 'SUBMITTED', label: 'Awaiting review' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
            className="w-52"
          />
        </div>

        <DataTable
          dataset="verifications"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message } : null}
          onRetry={() => void list.refetch()}
          onRowClick={(row) => setOpenId(row.id)}
          selectedRowId={openId}
          caption="Stock verification sessions"
          emptyState={
            <EmptyState
              variant="no-data"
              title="No counts yet"
              description="Start a count against a location to compare system stock with what is physically there."
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

      <Drawer
        open={openId !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
        title={session?.reference ?? 'Count'}
        subtitle={session ? `${session.location_code} · ${session.status}` : undefined}
        size="lg"
        footer={
          session?.status === 'DRAFT' ? (
            <PermissionGate permission="stockverify.create">
              <Button
                variant="primary"
                loading={submit.isPending}
                onClick={() => submit.mutate(session.id)}
              >
                Submit for review
              </Button>
            </PermissionGate>
          ) : session?.status === 'SUBMITTED' ? (
            <PermissionGate permission="stockverify.approve">
              <>
                <Button
                  variant="ghost"
                  loading={review.isPending}
                  onClick={() => review.mutate({ id: session.id, approve: false, remarks: reviewRemarks })}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  loading={review.isPending}
                  onClick={() => review.mutate({ id: session.id, approve: true, remarks: reviewRemarks })}
                >
                  Approve
                </Button>
              </>
            </PermissionGate>
          ) : null
        }
      >
        {session ? (
          <div className="flex flex-col gap-5 p-5">
            <StatPanel
              columns={3}
              stats={[
                { label: 'Expected', value: session.expected_count },
                { label: 'Scanned', value: session.scanned_count },
                { label: 'Matched', value: session.matched_count },
                { label: 'Missing', value: session.missing_count },
                { label: 'Unexpected', value: session.unexpected_count },
                { label: 'Variance', value: session.variance },
              ]}
            />

            {session.status === 'DRAFT' ? (
              <ScanField
                label="Scan a pallet at this location"
                placeholder="Scan the pallet label"
                onScan={(barcode) => scan.mutate({ id: session.id, barcode })}
                resolving={scan.isPending}
                error={scan.error ? <Alert tone="danger" title={scan.error.message} live /> : undefined}
              />
            ) : null}

            {session.status === 'SUBMITTED' ? (
              <Field label="Review remarks">
                <Textarea value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)} maxLength={500} />
              </Field>
            ) : null}

            <div>
              <p className="mb-2 text-overline uppercase text-graphite-500">Lines</p>
              {(session.lines ?? []).length === 0 ? (
                <p className="text-body-sm text-graphite-500">No lines recorded.</p>
              ) : (
                <ul className="divide-y divide-graphite-200/80 overflow-hidden rounded-xl border border-graphite-200/80 bg-graphite-0 shadow-xs">
                  {session.lines!.map((line) => (
                    <li key={line.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="font-mono text-mono text-graphite-900">
                        {line.pallet_number ?? '—'}
                      </span>
                      <span className="flex items-center gap-2">
                        {line.outcome === 'UNEXPECTED' && line.system_location_code ? (
                          <span className="text-caption text-graphite-500">
                            system says {line.system_location_code}
                          </span>
                        ) : null}
                        <Badge tone={OUTCOME_TONE[line.outcome]}>{line.outcome}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {session.review_remarks ? (
              <div>
                <p className="text-overline uppercase text-graphite-500">Review</p>
                <p className="mt-1 text-body-sm text-graphite-700">{session.review_remarks}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
