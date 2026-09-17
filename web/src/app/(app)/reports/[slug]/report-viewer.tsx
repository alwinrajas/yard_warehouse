'use client'

import { Download } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/layout/page-header'
import {
  Button,
  EmptyState,
  Input,
  Pagination,
  Panel,
  Select,
  Skeleton,
} from '@/components/ui'
import { useFacilityLookup } from '@/features/masters/use-lookups'
import { findReport } from '@/features/reports/report-catalogue'
import { useApi } from '@/features/shared/use-api'
import type { ReportResponse } from '@/lib/api/inventory-types'
import { formatDateTime, formatNumber, timezoneLabel } from '@/lib/format'
import { useUrlState } from '@/lib/url-state'

/**
 * W-10 Report viewer (docs/23 §10).
 *
 * One shell for all thirteen. Column headers come from the data, so a report is
 * a query definition on the server plus a row in the catalogue — not a screen.
 */
export function ReportViewer({ slug }: { slug: string }) {
  const url = useUrlState()
  const def = findReport(slug)
  const facilities = useFacilityLookup()

  const page = url.getNumber('page', 1)
  const pageSize = url.getNumber('pageSize', 50)

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  for (const key of ['from', 'to', 'facility_id', 'job_number', 'pallet_number', 'min_age']) {
    const value = url.get(key)
    if (value) params.set(key, value)
  }

  const needsInput = def?.requiresInput === 'pallet' && !url.get('pallet_number')

  const { data, isLoading, error, refetch } = useApi<ReportResponse>(
    ['report', slug, params.toString()],
    `/api/proxy/reports/${slug}?${params.toString()}`,
    !needsInput,
  )

  const rows = data?.rows ?? []
  const columns = rows.length > 0 ? Object.keys(rows[0]!) : []

  function exportCsv() {
    if (rows.length === 0) return
    const header = columns.join(',')
    const body = rows
      .map((row) => columns.map((c) => JSON.stringify(row[c] ?? '')).join(','))
      .join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `alutrack-${slug}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={def?.title ?? slug}
        context={def?.description}
        breadcrumbs={[
          { label: 'Insights' },
          { label: 'Reports', href: '/reports' },
          { label: def?.title ?? slug },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/reports">All reports</Link>
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Download className="size-4" />}
              disabled={rows.length === 0}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      <Panel className="shadow-card">
        <div className="flex flex-wrap items-end gap-3">
          {def?.filters.includes('dateRange') ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-label text-graphite-700">From</span>
                <Input
                  type="date"
                  value={url.get('from') ?? ''}
                  onChange={(e) => url.set({ from: e.target.value || null })}
                  className="w-40"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label text-graphite-700">To</span>
                <Input
                  type="date"
                  value={url.get('to') ?? ''}
                  onChange={(e) => url.set({ to: e.target.value || null })}
                  className="w-40"
                />
              </label>
            </>
          ) : null}

          {def?.filters.includes('facility') ? (
            <label className="flex flex-col gap-1">
              <span className="text-label text-graphite-700">Facility</span>
              <Select
                ariaLabel="Facility"
                placeholder="All facilities"
                value={url.get('facility_id') ?? 'all'}
                onValueChange={(v) => url.set({ facility_id: v === 'all' ? null : v })}
                options={[
                  { value: 'all', label: 'All facilities' },
                  ...(facilities.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })),
                ]}
                className="w-52"
              />
            </label>
          ) : null}

          {def?.filters.includes('job') ? (
            <label className="flex flex-col gap-1">
              <span className="text-label text-graphite-700">Job number</span>
              <Input
                mono
                value={url.get('job_number') ?? ''}
                onChange={(e) => url.set({ job_number: e.target.value || null })}
                className="w-44"
              />
            </label>
          ) : null}

          {def?.filters.includes('pallet') ? (
            <label className="flex flex-col gap-1">
              <span className="text-label text-graphite-700">Pallet number</span>
              <Input
                mono
                value={url.get('pallet_number') ?? ''}
                onChange={(e) => url.set({ pallet_number: e.target.value || null })}
                className="w-48"
              />
            </label>
          ) : null}

          {def?.filters.includes('minAge') ? (
            <label className="flex flex-col gap-1">
              <span className="text-label text-graphite-700">Minimum age (days)</span>
              <Input
                type="number"
                min={0}
                value={url.get('min_age') ?? ''}
                onChange={(e) => url.set({ min_age: e.target.value || null })}
                className="w-40"
              />
            </label>
          ) : null}

          <Button variant="ghost" onClick={() => url.clear()}>
            Clear
          </Button>
        </div>

        {data?.summary && Object.keys(data.summary).length > 0 ? (
          <dl className="mt-4 flex flex-wrap gap-6 border-t border-graphite-200 pt-4">
            {Object.entries(data.summary).map(([key, value]) => (
              <div key={key}>
                <dt className="text-overline uppercase text-graphite-500">{key.replace(/_/g, ' ')}</dt>
                <dd className="mt-0.5 text-h3 tabular-nums text-graphite-900">
                  {typeof value === 'number' ? formatNumber(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Panel>

      <Panel padded={false} className="overflow-hidden shadow-card">
        {needsInput ? (
          <EmptyState
            variant="not-started"
            title="Enter a pallet number to run this report"
            description="Traceability reconstructs the lifecycle of one pallet."
          />
        ) : isLoading ? (
          <div className="p-4">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="mt-2 h-6 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            variant="error"
            title="Could not run this report"
            description={error.message}
            errorCode={error.code}
            action={
              <Button variant="primary" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            variant="no-results"
            title="No rows for these filters"
            description="Widen the date range or clear the filters."
            action={
              <Button variant="primary" onClick={() => url.clear()}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <caption className="sr-only">{def?.title}</caption>
                <thead className="sticky top-0 bg-graphite-50/90 backdrop-blur-xs">
                  <tr className="border-b border-graphite-200/80">
                    {columns.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="whitespace-nowrap px-4 py-3 text-left text-overline uppercase tracking-wider text-graphite-500 font-medium"
                      >
                        {column.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-200/80">
                  {rows.map((row, index) => (
                    <tr key={index} className="transition-colors duration-fast hover:bg-anodic-50/30">
                      {columns.map((column) => {
                        const value = row[column]
                        const isDate = /_at$|^date$/.test(column) && typeof value === 'string'
                        const isCode = /code|number|reference|ref/.test(column)
                        return (
                          <td
                            key={column}
                            className={`whitespace-nowrap px-4 py-2 ${
                              isCode ? 'font-mono text-mono text-graphite-900' : 'text-graphite-700'
                            }`}
                          >
                            {value === null || value === undefined || value === ''
                              ? '—'
                              : isDate
                                ? formatDateTime(value as string)
                                : typeof value === 'boolean'
                                  ? value ? 'Yes' : 'No'
                                  : String(value)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={rows.length < pageSize ? (page - 1) * pageSize + rows.length : page * pageSize + 1}
              onPageChange={(p) => url.set({ page: p }, { resetPage: false })}
              onPageSizeChange={(s) => url.set({ pageSize: s })}
            />

            <p className="border-t border-graphite-200 px-4 py-2 text-caption text-graphite-500">
              Generated {formatDateTime(new Date())} ({timezoneLabel()}) · ALU TRACK
            </p>
          </>
        )}
      </Panel>
    </div>
  )
}
