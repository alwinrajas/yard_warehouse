'use client'

import { useEffect, useState } from 'react'

import { Alert, Button, Combobox, Drawer, Field, Input, Select, Textarea } from '@/components/ui'
import { useFacilityLookup, useZoneLookup } from '@/features/masters/use-lookups'
import { fieldErrorsFrom, isFieldValidation, useMasterMutation } from '@/features/masters/use-master-mutations'
import { LOCATION_TYPE_LABELS, type LocationRecord, type LocationType } from '@/lib/api/types'

type FormState = {
  facility_id: string | null
  zone_id: string | null
  code: string
  description: string
  location_type: LocationType
  capacity: string
  sequence: string
}

const EMPTY: FormState = {
  facility_id: null,
  zone_id: null,
  code: '',
  description: '',
  location_type: 'STORAGE',
  capacity: '',
  sequence: '0',
}

export function LocationFormDrawer({
  open,
  location,
  readOnly,
  onClose,
}: {
  open: boolean
  location: LocationRecord | null
  readOnly?: boolean
  onClose: () => void
}) {
  const facilities = useFacilityLookup()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const zones = useZoneLookup(form.facility_id)

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    setForm(
      location
        ? {
            facility_id: location.facility_id,
            zone_id: location.zone_id,
            code: location.code,
            description: location.description ?? '',
            location_type: location.location_type,
            capacity: location.capacity === null ? '' : String(location.capacity),
            sequence: String(location.sequence),
          }
        : EMPTY,
    )
  }, [open, location])

  const save = useMasterMutation<FormState, LocationRecord>('locations', (values) => ({
    path: location ? `/api/proxy/locations/${location.id}` : '/api/proxy/locations',
    method: location ? 'PUT' : 'POST',
    body: {
      facility_id: values.facility_id ? Number(values.facility_id) : null,
      zone_id: values.zone_id ? Number(values.zone_id) : null,
      code: values.code.trim(),
      description: values.description.trim() || null,
      location_type: values.location_type,
      capacity: values.capacity.trim() === '' ? null : Number(values.capacity),
      sequence: Number(values.sequence) || 0,
    },
  }))

  function submit() {
    setFieldErrors({})
    if (!form.facility_id) {
      setFieldErrors({ facility_id: 'Select the facility this location belongs to.' })
      return
    }
    save.mutate(form, { onSuccess: onClose, onError: (error) => setFieldErrors(fieldErrorsFrom(error)) })
  }

  const ruleError = save.error && !isFieldValidation(save.error) ? save.error : null

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={location ? `Edit ${location.code}` : 'New location'}
      subtitle={
        location
          ? [location.facility_name, location.zone_name].filter(Boolean).join(' › ')
          : 'A storage position pallets can be put away to'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly ? (
            <Button variant="primary" onClick={submit} loading={save.isPending} loadingLabel="Saving…">
              {location ? 'Save changes' : 'Create location'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        {ruleError ? <Alert tone="danger" title={ruleError.message} live /> : null}

        <Field label="Facility" required error={fieldErrors['facility_id'] ?? null}>
          <Combobox
            ariaLabel="Facility"
            options={(facilities.data?.items ?? []).map((facility) => ({
              value: facility.id,
              label: facility.name,
              description: facility.code,
            }))}
            value={form.facility_id}
            onValueChange={(value) => setForm((f) => ({ ...f, facility_id: value, zone_id: null }))}
            disabled={readOnly || save.isPending}
            placeholder={facilities.isLoading ? 'Loading facilities…' : 'Select a facility'}
          />
        </Field>

        <Field
          label="Zone"
          error={fieldErrors['zone_id'] ?? null}
          description="Optional. A zone must belong to the selected facility."
        >
          <Combobox
            ariaLabel="Zone"
            clearable
            options={(zones.data?.items ?? []).map((zone) => ({
              value: zone.id,
              label: zone.name,
              description: zone.code,
            }))}
            value={form.zone_id}
            onValueChange={(value) => setForm((f) => ({ ...f, zone_id: value }))}
            disabled={readOnly || save.isPending || !form.facility_id}
            placeholder={form.facility_id ? 'No zone' : 'Select a facility first'}
          />
        </Field>

        <Field
          label="Location code"
          required
          error={fieldErrors['code'] ?? null}
          description="Unique within the site. This becomes the location's permanent identity."
        >
          <Input
            mono
            placeholder="YD-A-03-018"
            value={form.code}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, code: event.target.value }))}
          />
        </Field>

        <Field label="Type" required error={fieldErrors['location_type'] ?? null}>
          <Select
            ariaLabel="Location type"
            value={form.location_type}
            onValueChange={(value) => setForm((f) => ({ ...f, location_type: value as LocationType }))}
            disabled={readOnly || save.isPending}
            options={Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Field>

        <Field
          label="Capacity"
          error={fieldErrors['capacity'] ?? null}
          description="Pallets this location can hold. Leave blank if capacity is not defined — capacity rules are not yet confirmed (OI-04)."
        >
          <Input
            type="number"
            min={1}
            placeholder="Not defined"
            value={form.capacity}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, capacity: event.target.value }))}
          />
        </Field>

        <Field label="Sequence" error={fieldErrors['sequence'] ?? null} description="Pick-path ordering.">
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
