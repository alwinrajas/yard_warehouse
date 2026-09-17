'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { OperationError } from '@/features/operations/operation-error'
import { Alert, Button, Field, Input, Modal, Select, Switch, Textarea } from '@/components/ui'
import { request } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import type { SettingRow } from '@/lib/api/admin-types'

/**
 * A single setting change.
 *
 * The control is chosen from the setting's declared type, so a typo cannot
 * produce an invalid value in the first place — and the server validates the
 * same rules again regardless (UX: frontend validation is usability only).
 */
export function SettingEditor({ setting, onClose }: { setting: SettingRow; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(setting.value ?? '')

  const save = useMutation<SettingRow, ApiError, void>({
    mutationFn: () =>
      request<SettingRow>(`/api/proxy/settings/${setting.id}`, {
        method: 'PUT',
        body: { value: setting.type === 'INT' ? Number(value) : value },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      onClose()
    },
  })

  const unchanged = value === (setting.value ?? '')

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={setting.key}
      description={setting.description}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={unchanged}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {save.error ? <OperationError error={save.error} onRetry={() => save.reset()} /> : null}

        {setting.requires_confirmation ? (
          <Alert tone="warning" title="This setting changes how the system behaves">
            {setting.notes ?? 'Confirm the new value is what operations expect before saving.'}
          </Alert>
        ) : null}

        <Field
          label="Value"
          required
          description={`${setting.reference} · default ${setting.default_value ?? '—'}`}
        >
          {setting.type === 'BOOL' ? (
            <Switch
              checked={value === 'true'}
              onCheckedChange={(on) => setValue(on ? 'true' : 'false')}
              label={value === 'true' ? 'On' : 'Off'}
              ariaLabel={setting.key}
            />
          ) : setting.type === 'ENUM' ? (
            <Select
              ariaLabel={setting.key}
              value={value}
              onValueChange={setValue}
              options={(setting.allowed_values ?? []).map((option) => ({
                value: option,
                label: option,
              }))}
            />
          ) : setting.type === 'JSON' ? (
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              className="font-mono"
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode={setting.type === 'INT' ? 'numeric' : 'text'}
              className="font-mono"
            />
          )}
        </Field>

        <p className="text-caption text-graphite-500">
          This change is recorded in the audit trail with the previous and new value.
        </p>
      </div>
    </Modal>
  )
}
