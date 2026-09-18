'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Alert, Button, Field, Input } from '@/components/ui'
import { request } from '@/lib/api/client'
import { ApiError, loginErrorMessage } from '@/lib/api/errors'
import type { Session } from '@/lib/permissions/session'

type LoginResult = { session: Session; mustChangePassword: boolean }

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')

  // A PDA operator holds auth.login_pda, not auth.login_web, so signing in on
  // the wrong channel locks them out of the only surface they are allowed to
  // use. The destination decides the channel, and the channel is what the
  // ledger records against every transaction from this session.
  const channel = next?.startsWith('/pda') ? 'PDA' : 'WEB'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const nextFieldErrors: typeof fieldErrors = {}
    if (!username.trim()) nextFieldErrors.username = 'Enter your username.'
    if (!password) nextFieldErrors.password = 'Enter your password.'
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) return

    setSubmitting(true)
    try {
      const result = await request<LoginResult>('/api/auth/login', {
        method: 'POST',
        body: { username: username.trim(), password, channel },
      })

      // A forced password change takes precedence over the requested destination.
      if (result.mustChangePassword) {
        router.replace('/profile?mustChangePassword=1')
        return
      }
      router.replace(next && next.startsWith('/') ? next : channel === 'PDA' ? '/pda' : '/dashboard')
    } catch (caught) {
      const apiError =
        caught instanceof ApiError
          ? caught
          : new ApiError({ code: 'UNKNOWN', message: 'Sign in failed.', status: 500 })
      setError(loginErrorMessage(apiError))
      setPassword('')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-overline uppercase tracking-[0.16em] text-anodic-600">
        {channel === 'PDA' ? 'Operator access' : 'Secure access'}
      </p>
      <h2 className="mt-2 text-h1 text-graphite-900">
        {channel === 'PDA' ? 'Sign in to the PDA' : 'Sign in to your workspace'}
      </h2>
      <p className="mt-1.5 text-body-sm text-graphite-500">
        {channel === 'PDA'
          ? 'Use your individual operator account. Shared logins are not permitted.'
          : 'Use your individual ALU TRACK account.'}
      </p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4" noValidate>
        <Field label="Username" required error={fieldErrors.username ?? null}>
          <Input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            value={username}
            disabled={submitting}
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>

        <Field label="Password" required error={fieldErrors.password ?? null}>
          <Input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            disabled={submitting}
            onChange={(event) => setPassword(event.target.value)}
            trailing={
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
                className="rounded-sm text-graphite-500 hover:text-graphite-800"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            }
          />
        </Field>

        {error ? (
          <Alert tone="danger" title={error.title} live>
            {error.detail}
          </Alert>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          loadingLabel="Signing in…"
        >
          Sign in
        </Button>
      </form>

      <div className="mt-6 border-t border-graphite-200/80 pt-4">
        <p className="text-caption text-graphite-500">
          Forgotten your password? ALU TRACK accounts are administrator-managed — contact your
          system administrator for a reset. There is no self-service reset.
        </p>
      </div>
    </div>
  )
}
