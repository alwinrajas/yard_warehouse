'use client'

import { useEffect, useState } from 'react'

import { Alert, Button, Combobox, Drawer, Field, Input, Textarea } from '@/components/ui'
import { useFacilityLookup } from '@/features/masters/use-lookups'
import { fieldErrorsFrom, isFieldValidation, useMasterMutation } from '@/features/masters/use-master-mutations'
import type { Zone } from '@/lib/api/types'

type FormState = { facility_id: string | null; code: string; name: string; description: string; sequence: string }

const EMPTY: FormState = { facility_id: null, code: '', name: '', description: '', sequence: '0' }

export function ZoneFormDrawer({
  open,
  zone,
  readOnly,
  onClose,
}: {
  open: boolean
  zone: Zone | null
  readOnly?: boolean
  onClose: () => void
}) {
  const facilities = useFacilityLookup()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    setForm(
      zone
        ? {
            facility_id: zone.facility_id,
            code: zone.code,
            name: zone.name,
            description: zone.description ?? '',
            sequence: String(zone.sequence),
          }
        : EMPTY,
    )
  }, [open, zone])

  const save = useMasterMutation<FormState, Zone>('zones', (values) => ({
    path: zone ? `/api/proxy/zones/${zone.id}` : '/api/proxy/zones',
    method: zone ? 'PUT' : 'POST',
    body: {
      facility_id: values.facility_id ? Number(values.facility_id) : null,
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description.trim() || null,
      sequence: Number(values.sequence) || 0,
    },
  }))

  function submit() {
    setFieldErrors({})
    if (!form.facility_id) {
      setFieldErrors({ facility_id: 'Select the facility this zone belongs to.' })
      return
    }
    save.mutate(form, { onSuccess: onClose, onError: (error) => setFieldErrors(fieldErrorsFrom(error)) })
  }

  const ruleError = save.error && !isFieldValidation(save.error) ? save.error : null

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={zone ? `Edit ${zone.code}` : 'New zone'}
      subtitle={zone?.facility_name ?? 'Zones divide a facility into areas'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly ? (
            <Button variant="primary" onClick={submit} loading={save.isPending} loadingLabel="Saving…">
              {zone ? 'Save changes' : 'Create zone'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        {ruleError ? <Alert tone="danger" title={ruleError.message} live /> : null}

        <Field
          label="Facility"
          required
          error={fieldErrors['facility_id'] ?? null}
          description={zone ? 'A zone holding locations cannot be moved to another facility.' : undefined}
        >
          <Combobox
            ariaLabel="Facility"
            options={(facilities.data?.items ?? []).map((facility) => ({
              value: facility.id,
              label: facility.name,
              description: facility.code,
            }))}
            value={form.facility_id}
            onValueChange={(value) => setForm((f) => ({ ...f, facility_id: value }))}
            disabled={readOnly || save.isPending}
            placeholder={facilities.isLoading ? 'Loading facilities…' : 'Select a facility'}
          />
        </Field>

        <Field label="Zone code" required error={fieldErrors['code'] ?? null} description="Unique within the facility.">
          <Input
            mono
            value={form.code}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, code: event.target.value }))}
          />
        </Field>

        <Field label="Zone name" required error={fieldErrors['name'] ?? null}>
          <Input
            value={form.name}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
          />
        </Field>

        <Field label="Sequence" error={fieldErrors['sequence'] ?? null} description="Display and pick-path ordering.">
          <Input
            type="number"
            min={0}
            value={form.sequence}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, sequence: event.target.value }))}
          />
        </Field>

        <Field label="Description" error={fieldErrors['description'] ?? null}>
          <Textarea
            value={form.description}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
          />
        </Field>
      </div>
    </Drawer>
  )
}
