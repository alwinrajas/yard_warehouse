'use client'

import { useMutation } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { ExceptionPanel } from '@/components/domain/exception-panel'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Button,
  Combobox,
  EmptyState,
  Field,
  Panel,
  PanelHeader,
  ProgressSteps,
  StatPanel,
} from '@/components/ui'
import { request, upload } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import type { ImportBatch } from '@/lib/api/types'
import { useSiteLookup } from '@/features/masters/use-lookups'
import { formatNumber } from '@/lib/format'

/**
 * W-23a Location Import (docs/23 §10).
 *
 * Two phases, and the separation is the point: validation writes nothing, the
 * user sees every row-level error, and only then can they commit. The commit is
 * all-or-nothing on the server, so a partially imported hierarchy cannot exist.
 * Invalid rows are never silently skipped — the commit is refused while any row
 * is invalid.
 */
export function LocationImportScreen() {
  const router = useRouter()
  const sites = useSiteLookup()
  const fileInput = useRef<HTMLInputElement>(null)

  const [siteId, setSiteId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [batch, setBatch] = useState<ImportBatch | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const validate = useMutation<ImportBatch, ApiError, { file: File; siteId: string }>({
    mutationFn: async ({ file: selected, siteId: site }) => {
      const form = new FormData()
      form.append('file', selected)
      form.append('site_id', site)
      return upload<ImportBatch>('/api/proxy/locations/import/validate', form)
    },
    onSuccess: (result) => {
      setBatch(result)
      setError(null)
    },
    onError: (caught) => {
      setBatch(null)
      setError(caught)
    },
  })

  const commit = useMutation<ImportBatch, ApiError, string>({
    mutationFn: (batchId) =>
      request<ImportBatch>(`/api/proxy/locations/import/${batchId}/commit`, { method: 'POST' }),
    onSuccess: (result) => {
      setBatch(result)
      setError(null)
    },
    onError: (caught) => setError(caught),
  })

  const step = batch?.status === 'COMMITTED' ? 2 : batch ? 1 : 0
  const committed = batch?.status === 'COMMITTED'
  const validated = batch?.status === 'VALIDATED'
  const failed = batch?.status === 'FAILED'

  function reset() {
    setBatch(null)
    setFile(null)
    setError(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Import locations"
        context="Validate a location file, review every row, then commit"
        breadcrumbs={[
          { label: 'Configuration' },
          { label: 'Locations', href: '/masters/locations' },
          { label: 'Import' },
        ]}
        actions={
          <Button variant="secondary" leftIcon={<Download className="size-4" />} asChild>
            <a href="/api/proxy/locations/template" download>
              Download template
            </a>
          </Button>
        }
      />

      <ProgressSteps
        current={step}
        steps={[
          { id: 'select', label: 'Choose file' },
          { id: 'validate', label: 'Review validation' },
          { id: 'commit', label: 'Commit' },
        ]}
      />

      {/* -------------------------------------------------- step 1: choose */}
      <Panel className="shadow-card">
        <PanelHeader
          title="Choose a file"
          description="CSV with columns: facility_code, zone_code, location_code, description, location_type, capacity, sequence"
        />

        <div className="flex flex-col gap-4">
          <Field label="Site" required description="Location codes are unique within a site.">
            <Combobox
              ariaLabel="Site"
              options={(sites.data?.items ?? []).map((site) => ({
                value: site.id,
                label: site.name,
                description: site.code,
              }))}
              value={siteId}
              onValueChange={(value) => {
                setSiteId(value)
                reset()
              }}
              disabled={validate.isPending || commit.isPending || committed}
              placeholder={sites.isLoading ? 'Loading sites…' : 'Select a site'}
            />
          </Field>

          <Field label="Location file" required>
            <div className="flex items-center gap-3">
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                aria-label="Location file"
                disabled={validate.isPending || commit.isPending || committed}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  setBatch(null)
                  setError(null)
                }}
                className="block w-full text-body-sm text-graphite-700 file:mr-3 file:rounded-md file:border file:border-graphite-300 file:bg-graphite-0 file:px-3 file:py-1.5 file:text-body-sm file:text-graphite-700 hover:file:bg-graphite-50"
              />
            </div>
          </Field>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              leftIcon={<Upload className="size-4" />}
              loading={validate.isPending}
              loadingLabel="Validating…"
              disabled={!file || !siteId || committed}
              onClick={() => {
                if (file && siteId) validate.mutate({ file, siteId })
              }}
            >
              Validate file
            </Button>
            {batch ? (
              <Button variant="ghost" onClick={reset} disabled={validate.isPending || commit.isPending}>
                Start over
              </Button>
            ) : null}
          </div>
        </div>
      </Panel>

      {/* -------------------------------------------------- errors */}
      {error ? (
        <ExceptionPanel
          headingLevel={2}
          title={error.message}
          description="Nothing was imported."
          errorCode={error.code}
          traceId={error.traceId}
          actions={
            <Button variant="secondary" size="sm" onClick={reset}>
              Choose another file
            </Button>
          }
        />
      ) : null}

      {/* -------------------------------------------------- step 2: review */}
      {batch && !committed ? (
        <Panel className="shadow-card">
          <PanelHeader
            title="Validation result"
            description={
              failed
                ? 'Correct the file and upload it again. Nothing has been written.'
                : 'Nothing has been written yet. Review the rows, then commit.'
            }
          />

          <StatPanel
            columns={3}
            stats={[
              { label: 'Rows in file', value: formatNumber(batch.total_rows) },
              { label: 'Valid', value: formatNumber(batch.valid_rows) },
              { label: 'With errors', value: formatNumber(batch.error_rows) },
            ]}
          />

          {failed && batch.errors?.length ? (
            <div className="mt-5">
              <Alert tone="danger" title={`${batch.error_rows} row${batch.error_rows === 1 ? '' : 's'} cannot be imported`}>
                Every row must be valid before this file can be committed — invalid rows are never
                skipped silently.
              </Alert>

              <div className="mt-3 overflow-hidden rounded-xl border border-graphite-200/80">
                <table className="w-full text-body-sm">
                  <caption className="sr-only">Row-level validation errors</caption>
                  <thead className="bg-graphite-50">
                    <tr className="border-b border-graphite-200">
                      <th scope="col" className="w-20 px-4 py-2.5 text-left text-overline uppercase text-graphite-500">
                        Line
                      </th>
                      <th scope="col" className="w-48 px-4 py-2.5 text-left text-overline uppercase text-graphite-500">
                        Location code
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left text-overline uppercase text-graphite-500">
                        Problem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.errors.map((row) => (
                      <tr key={`${row.line}-${row.code}`} className="border-b border-graphite-200 last:border-0">
                        <td className="px-4 py-2 tabular-nums text-graphite-600">{row.line}</td>
                        <td className="px-4 py-2 font-mono text-mono text-graphite-900">{row.code || '—'}</td>
                        <td className="px-4 py-2 text-signal-danger-fg">
                          <ul className="flex flex-col gap-0.5">
                            {row.errors.map((message) => (
                              <li key={message}>{message}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {validated ? (
            <div className="mt-5 flex flex-col gap-4">
              <Alert tone="success" title="Every row is valid">
                {formatNumber(batch.valid_rows)} location
                {batch.valid_rows === 1 ? '' : 's'} will be created. This commit is all-or-nothing.
              </Alert>

              {batch.preview?.length ? (
                <div className="overflow-hidden rounded-xl border border-graphite-200/80">
                  <table className="w-full text-body-sm">
                    <caption className="sr-only">Preview of the first rows to be created</caption>
                    <thead className="bg-graphite-50">
                      <tr className="border-b border-graphite-200">
                        <th scope="col" className="px-4 py-2.5 text-left text-overline uppercase text-graphite-500">
                          Location code
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-left text-overline uppercase text-graphite-500">
                          Type
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-right text-overline uppercase text-graphite-500">
                          Capacity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.preview.map((row) => (
                        <tr key={row.line} className="border-b border-graphite-200 last:border-0">
                          <td className="px-4 py-2 font-mono text-mono text-graphite-900">{row.code}</td>
                          <td className="px-4 py-2 text-graphite-600">{row.location_type}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-graphite-600">
                            {row.capacity ?? 'Not defined'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {batch.valid_rows > batch.preview.length ? (
                    <p className="border-t border-graphite-200 px-4 py-2 text-caption text-graphite-500">
                      Showing the first {batch.preview.length} of {formatNumber(batch.valid_rows)} rows.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <Button
                  variant="primary"
                  leftIcon={<FileSpreadsheet className="size-4" />}
                  loading={commit.isPending}
                  loadingLabel="Committing…"
                  onClick={() => commit.mutate(batch.id)}
                >
                  Commit {formatNumber(batch.valid_rows)} location
                  {batch.valid_rows === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          ) : null}
        </Panel>
      ) : null}

      {/* -------------------------------------------------- step 3: done */}
      {committed ? (
        <Panel padded={false} className="shadow-card">
          <EmptyState
            headingLevel={2}
            variant="not-started"
            title="Import committed"
            description={`${formatNumber(batch.valid_rows)} location${batch.valid_rows === 1 ? '' : 's'} created from ${batch.original_filename}.`}
            action={
              <Button variant="primary" onClick={() => router.push('/masters/locations')}>
                View locations
              </Button>
            }
            secondaryAction={
              <Button variant="secondary" onClick={reset}>
                Import another file
              </Button>
            }
          />
        </Panel>
      ) : null}

      {!batch && !error ? (
        <Alert tone="info" title="Nothing is written until you commit">
          Validation reports every problem row by row. The commit then creates all rows or none, so a
          partially imported hierarchy cannot exist. Need the column layout?{' '}
          <a href="/api/proxy/locations/template" download className="underline underline-offset-2">
            Download the template
          </a>
          .
        </Alert>
      ) : null}
    </div>
  )
}
