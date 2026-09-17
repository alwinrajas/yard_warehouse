'use client'

import { useState, type FormEvent } from 'react'

import { Alert, Button, Field, Input } from '@/components/ui'
import { request } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'

/** CFG-10 — mirrors the documented policy. The server is authoritative (docs/07 §6). */
const MIN_LENGTH = 12

type FieldErrors = { current?: string; next?: string; confirm?: string }

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null)
  const [done, setDone] = useState(false)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!current) errors.current = 'Enter your current password.'
    if (!next) errors.next = 'Enter a new password.'
    else if (next.length < MIN_LENGTH) errors.next = `Use at least ${MIN_LENGTH} characters.`
    else if (next === current) errors.next = 'Choose a password you have not used here before.'
    if (confirm !== next) errors.confirm = 'This does not match the new password.'
    return errors
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setDone(false)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await request('/api/auth/change-password', {
        method: 'POST',
        body: {
          current_password: current,
          new_password: next,
          new_password_confirmation: confirm,
        },
      })
      setDone(true)
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (caught) {
      const apiError =
        caught instanceof ApiError
          ? caught
          : new ApiError({ code: 'UNKNOWN', message: 'Password could not be changed.', status: 500 })

      if (apiError.code === 'CURRENT_PASSWORD_INVALID') {
        setFieldErrors({ current: 'That is not your current password.' })
      } else if (apiError.code === 'PASSWORD_POLICY') {
        setFieldErrors({ next: apiError.message })
      } else {
        setError({
          title: apiError.message,
          detail: apiError.traceId ? `Reference ${apiError.traceId}` : undefined,
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4" noValidate>
      <Field label="Current password" required error={fieldErrors.current ?? null}>
        <Input
          type="password"
          autoComplete="current-password"
          value={current}
          disabled={submitting}
          onChange={(event) => setCurrent(event.target.value)}
        />
      </Field>

      <Field
        label="New password"
        required
        description={`At least ${MIN_LENGTH} characters, with mixed case, a digit and a symbol.`}
        error={fieldErrors.next ?? null}
      >
        <Input
          type="password"
          autoComplete="new-password"
          value={next}
          disabled={submitting}
          onChange={(event) => setNext(event.target.value)}
        />
      </Field>

      <Field label="Confirm new password" required error={fieldErrors.confirm ?? null}>
        <Input
          type="password"
          autoComplete="new-password"
          value={confirm}
          disabled={submitting}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </Field>

      {error ? (
        <Alert tone="danger" title={error.title} live>
          {error.detail}
        </Alert>
      ) : null}

      {done ? (
        <Alert tone="success" title="Password changed" live>
          Use your new password the next time you sign in.
        </Alert>
      ) : null}

      <div>
        <Button
          type="submit"
          variant={forced ? 'primary' : 'secondary'}
          loading={submitting}
          loadingLabel="Changing…"
        >
          Change password
        </Button>
      </div>
    </form>
  )
}
