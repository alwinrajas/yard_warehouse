'use client'

import { useEffect, useState } from 'react'

import { Alert, Button, Drawer, Field, Input, Textarea } from '@/components/ui'
import { fieldErrorsFrom, isFieldValidation, useMasterMutation } from '@/features/masters/use-master-mutations'
import type { Site } from '@/lib/api/types'

type FormState = { code: string; name: string; address: string; timezone: string }

const EMPTY: FormState = { code: '', name: '', address: '', timezone: '' }

export function SiteFormDrawer({
  open,
  site,
  readOnly,
  onClose,
}: {
  open: boolean
  site: Site | null
  readOnly?: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    setForm(
      site
        ? {
            code: site.code,
            name: site.name,
            address: site.address ?? '',
            timezone: site.timezone ?? '',
          }
        : EMPTY,
    )
  }, [open, site])

  const save = useMasterMutation<FormState, Site>('sites', (values) => ({
    path: site ? `/api/proxy/sites/${site.id}` : '/api/proxy/sites',
    method: site ? 'PUT' : 'POST',
    body: {
      code: values.code.trim(),
      name: values.name.trim(),
      address: values.address.trim() || null,
      timezone: values.timezone.trim() || null,
    },
  }))

  function submit() {
    setFieldErrors({})
    save.mutate(form, {
      onSuccess: onClose,
      onError: (error) => setFieldErrors(fieldErrorsFrom(error)),
    })
  }

  const ruleError = save.error && !isFieldValidation(save.error) ? save.error : null

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={site ? `Edit ${site.code}` : 'New site'}
      subtitle={site ? 'Site code changes affect reporting history' : 'A site is the plant your facilities belong to'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly ? (
            <Button variant="primary" onClick={submit} loading={save.isPending} loadingLabel="Saving…">
              {site ? 'Save changes' : 'Create site'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        {ruleError ? (
          <Alert tone="danger" title={ruleError.message} live>
            {ruleError.code === 'RECORD_IN_USE' ? 'Remove the dependent records first.' : null}
          </Alert>
        ) : null}

        <Field label="Site code" required error={fieldErrors['code'] ?? null} description="Unique across the system. Letters, numbers, hyphens and underscores.">
          <Input
            mono
            value={form.code}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, code: event.target.value }))}
          />
        </Field>

        <Field label="Site name" required error={fieldErrors['name'] ?? null}>
          <Input
            value={form.name}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
          />
        </Field>

        <Field label="Address" error={fieldErrors['address'] ?? null}>
          <Textarea
            value={form.address}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, address: event.target.value }))}
          />
        </Field>

        <Field
          label="Timezone"
          error={fieldErrors['timezone'] ?? null}
          description="IANA name, e.g. Asia/Dubai. Leave blank to use the application timezone (CFG-13)."
        >
          <Input
            mono
            placeholder="Asia/Dubai"
            value={form.timezone}
            disabled={readOnly || save.isPending}
            onChange={(event) => setForm((f) => ({ ...f, timezone: event.target.value }))}
          />
        </Field>
      </div>
    </Drawer>
  )
}
