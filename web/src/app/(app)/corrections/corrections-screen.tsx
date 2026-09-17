'use client'

import { Wrench } from 'lucide-react'

import { useState } from 'react'

import { AuditDiff } from '@/components/domain/audit-diff'
import { PermissionGate } from '@/components/domain/permission-gate'
import { PrivilegedAction } from '@/components/domain/privileged-action'
import { TransactionRef } from '@/components/domain/transaction-ref'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Button,
  ConfirmDialog,
  DataTable,
  DataTableToolbar,
  Drawer,
  EmptyState,
  Field,
  Input,
  Pagination,
  Panel,
  Select,
  Textarea,
  type DataTableColumn,
} from '@/components/ui'
import { useReasonCodes } from '@/features/masters/use-lookups'
import { useApiList, useApiMutation } from '@/features/shared/use-api'
import type { TransactionRow } from '@/lib/api/inventory-types'
import { formatDateTime, formatNumber } from '@/lib/format'

const TYPES = [
  { value: 'PUTAWAY_LOCATION_CORRECTION', label: 'Put-away location correction' },
  { value: 'TRANSFER_REVERSAL', label: 'Transfer reversal' },
  { value: 'DISPATCH_REVERSAL', label: 'Dispatch reversal' },
  { value: 'STATUS_CORRECTION', label: 'Status correction' },
  { value: 'MANUAL_RELOCATION', label: 'Manual relocation' },
]

/**
 * W-18 / W-19 Corrections (docs/23 §9).
 *
 * Deliberately does not look like editing a row. There is no "Edit inventory"
 * control anywhere in ALU TRACK — this is the only path, and it always appends.
 */
export function CorrectionsScreen() {
  const list = useApiList<TransactionRow>('corrections', '/api/proxy/corrections')
  const reasons = useReasonCodes('CORRECTION')
  const [selected, setSelected] = useState<TransactionRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const [form, setForm] = useState({
    original_transaction_id: '',
    type: 'PUTAWAY_LOCATION_CORRECTION',
    reason_code_id: '',
    justification: '',
    location_id: '',
  })
  const [error, setError] = useState<string | null>(null)

  const create = useApiMutation<typeof form, unknown>(
    (vars) => ({
      path: '/api/proxy/corrections',
      body: {
        original_transaction_id: Number(vars.original_transaction_id),
        type: vars.type,
        reason_code_id: Number(vars.reason_code_id),
        justification: vars.justification,
        location_id: vars.location_id ? Number(vars.location_id) : null,
      },
    }),
    ['corrections', 'inventory', 'transactions', 'pallet'],
  )

  const columns: DataTableColumn<TransactionRow>[] = [
    { id: 'when', header: 'When', priority: 1, accessor: (r) => formatDateTime(r.created_at) },
    { id: 'ref', header: 'Correction', priority: 1, accessor: (r) => <TransactionRef reference={r.txn_ref} copyable={false} /> },
    { id: 'pallet', header: 'Pallet', priority: 1, accessor: (r) => <span className="font-mono text-mono">{r.pallet_number ?? '—'}</span> },
    { id: 'type', header: 'Type', priority: 2, accessor: (r) => String(r.new_values?.['correction_type'] ?? '—') },
    { id: 'reason', header: 'Reason', priority: 2, truncate: true, accessor: (r) => r.reason ?? '—' },
    { id: 'just', header: 'Justification', priority: 3, truncate: true, accessor: (r) => r.remarks ?? '—' },
    { id: 'by', header: 'Performed by', priority: 2, accessor: (r) => r.user_name ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Wrench className="size-5" />}
        title="Corrections"
        context={`${formatNumber(list.pagination.total)} correction${list.pagination.total === 1 ? '' : 's'} — every one preserved with its original`}
        breadcrumbs={[{ label: 'Operations' }, { label: 'Corrections' }]}
        actions={
          <PermissionGate permission="correction.perform">
            <Button variant="secondary" onClick={() => setCreating(true)}>
              New correction
            </Button>
          </PermissionGate>
        }
      />

      <Alert tone="info" title="Corrections append — they never rewrite history">
        A correction creates a new, linked transaction recording the before and after values. The
        original record is never modified.
      </Alert>

      <Panel padded={false} className="overflow-hidden shadow-card">
        <div className="p-4">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search reference or pallet…"
          />
        </div>

        <DataTable
          dataset="transactions"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error ? { code: list.error.code, message: list.error.message } : null}
          onRetry={() => void list.refetch()}
          onRowClick={setSelected}
          selectedRowId={selected?.id ?? null}
          caption="Corrections register"
          emptyState={
            <EmptyState
              variant="no-data"
              title="No corrections have been made"
              description="Corrections are rare by design. Each one requires a reason and a written justification."
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
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.txn_ref ?? ''}
        subtitle="Correction detail"
      >
        {selected ? (
          <div className="flex flex-col gap-4 p-5">
            <AuditDiff before={selected.previous_values} after={selected.new_values} />
            <div>
              <p className="text-overline uppercase text-graphite-500">Justification</p>
              <p className="mt-1 text-body-sm text-graphite-800">{selected.remarks ?? '—'}</p>
            </div>
            <p className="text-caption text-graphite-500">
              Performed by {selected.user_name ?? 'unknown'} on {formatDateTime(selected.created_at)}.
            </p>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={creating}
        onOpenChange={(open) => !open && setCreating(false)}
        title="New correction"
        subtitle="Privileged operation"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setError(null)
                if (!form.original_transaction_id || !form.reason_code_id) {
                  setError('Select the original transaction and a reason.')
                  return
                }
                if (form.justification.trim().length < 10) {
                  setError('Describe why this correction is necessary — at least 10 characters.')
                  return
                }
                setConfirm(true)
              }}
            >
              Review correction
            </Button>
          </>
        }
      >
        <div className="p-5">
          <PrivilegedAction
            title="This changes what the system says happened"
            description="The original transaction is preserved. This creates a new, audited correction record linked to it."
          >
            <div className="flex flex-col gap-4">
              {error ? <Alert tone="danger" title={error} live /> : null}
              {create.error ? <Alert tone="danger" title={create.error.message} live /> : null}

              <Field
                label="Original transaction ID"
                required
                description="The numeric id of the transaction being corrected. Find it on the transaction detail."
              >
                <Input
                  mono
                  value={form.original_transaction_id}
                  onChange={(e) => setForm((f) => ({ ...f, original_transaction_id: e.target.value }))}
                />
              </Field>

              <Field label="Correction type" required>
                <Select
                  ariaLabel="Correction type"
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                  options={TYPES}
                />
              </Field>

              <Field
                label="Destination location ID"
                description="Required for relocation and reversal corrections."
              >
                <Input
                  mono
                  value={form.location_id}
                  onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
                />
              </Field>

              <Field label="Reason" required>
                <Select
                  ariaLabel="Reason"
                  value={form.reason_code_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, reason_code_id: v }))}
                  placeholder={reasons.isLoading ? 'Loading…' : 'Select a correction reason'}
                  options={(reasons.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
                />
              </Field>

              <Field
                label="Justification"
                required
                description="At least 10 characters. This is permanent and appears in the audit trail."
              >
                <Textarea
                  value={form.justification}
                  onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
                  maxLength={500}
                  showCount
                />
              </Field>
            </div>
          </PrivilegedAction>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Apply this correction?"
        description="The original transaction stays exactly as it is. A new correction record will be created and audited."
        confirmLabel="Apply correction"
        tone="danger"
        typeToConfirm={form.original_transaction_id}
        typeToConfirmLabel="Type the original transaction ID to confirm"
        loading={create.isPending}
        onConfirm={() =>
          create.mutate(form, {
            onSuccess: () => {
              setConfirm(false)
              setCreating(false)
              setForm({
                original_transaction_id: '',
                type: 'PUTAWAY_LOCATION_CORRECTION',
                reason_code_id: '',
                justification: '',
                location_id: '',
              })
            },
            onError: () => setConfirm(false),
          })
        }
      />
    </div>
  )
}
