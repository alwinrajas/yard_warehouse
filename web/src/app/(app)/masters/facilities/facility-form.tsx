'use client'

import { useEffect, useState } from 'react'

import { Alert, Button, Combobox, Drawer, Field, Input, Select, Textarea } from '@/components/ui'
import { useSiteLookup } from '@/features/masters/use-lookups'
import { fieldErrorsFrom, isFieldValidation, useMasterMutation } from '@/features/masters/use-master-mutations'
import { FACILITY_TYPE_LABELS, type Facility, type FacilityType } from '@/lib/api/types'

type FormState = { site_id: string | null; code: string; name: string; type: FacilityType; description: string }

const EMPTY: FormState = { site_id: null, code: '', name: '', type: 'OPEN_YARD', description: '' }

export function FacilityFormDrawer({
  open,
  facility,
  readOnly,
  onClose,
}: {
  open: boolean
  facility: Facility | null
  readOnly?: boolean
  onClose: () => void
}) {
  const sites = useSiteLookup(open)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    setForm(
      facility
        ? {
            site_id: facility.site_id,
            code: facility.code,
            name: facility.name,
            type: facility.type,
            description: facility.description ?? '',
          }
        : EMPTY,
    )
  }, [open, facility])

  const save = useMasterMutation<FormState, Facility>('facilities', (values) => ({
    path: facility ? `/api/proxy/facilities/${facility.id}` : '/api/proxy/facilities',
    method: facility ? 'PUT' : 'POST',
    body: facility
      ? { code: values.code.trim(), name: values.name.trim(), type: values.type, description: values.description.trim() || null }
      : {
          site_id: values.site_id ? Number(values.site_id) : null,
          code: values.code.trim(),
          name: values.name.trim(),
          type: values.type,
          description: values.description.trim() || null,
        },
  }))

  function submit() {
    setFieldErrors({})
    if (!facility && !form.site_id) {
      setFieldErrors({ site_id: 'Select the site this facility belongs to.' })
      return
    }
    save.mutate(form, { onSuccess: onClose, onError: (error) => setFieldErrors(fieldErrorsFrom(error)) })
  }

  const ruleError = save.error && !isFieldValidation(save.error) ? save.error : null

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={facility ? `Edit ${facility.code}` : 'New facility'}
      subtitle={facility ? facility.site_name ?? undefined : 'Open yard, warehouse, dispatch or collection area'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly ? (
            <Button variant="primary" onClick={submit} loading={save.isPending} loadingLabel="Saving…">
              {facility ? 'Save changes' : 'Create facility'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        {ruleError ? <Alert tone="danger" title={ruleError.message} live /> : null}

        <Field
          label="Site"
          required
          error={fieldErrors['site_id'] ?? null}
          description={facility ? 'A facility cannot be moved to another site.' : undefined}
        >
          <Combobox
            ariaLabel="Site"
            options={(sites.data?.items ?? []).map((site) => ({
              value: site.id,
              label: site.name,
              description: site.code,
            }))}
            value={form.site_id}
            onValueChange={(value) => setForm((f) => ({ ...f, site_id: value }))}
            disabled={readOnly || save.isPending || facility !== null}
            placeholder={sites.isLoading ? 'Loading sites…' : 'Select a site'}
          />
        </Field>

        <Field label="Facility code" required error={fieldErrors['code'] ?? null} description="Unique within the site.">
          <Input
            mono
            value={form.code}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, code: event.target.value }))}
          />
        </Field>

        <Field label="Facility name" required error={fieldErrors['name'] ?? null}>
          <Input
            value={form.name}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
          />
        </Field>

        <Field
          label="Type"
          required
          error={fieldErrors['type'] ?? null}
          description="Only open yards and closed warehouses accept normal storage put-away."
        >
          <Select
            ariaLabel="Facility type"
            value={form.type}
            onValueChange={(value) => setForm((f) => ({ ...f, type: value as FacilityType }))}
            disabled={readOnly || save.isPending}
            options={Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
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
