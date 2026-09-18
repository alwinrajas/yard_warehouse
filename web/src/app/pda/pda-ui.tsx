'use client'

import { CircleCheck, CircleX, ScanLine } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { pdaFeedback } from '@/features/pda/feedback'

import type { ApiError } from '@/lib/api/errors'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'

/** Step heading. One instruction, large, at the top. */
export function PdaStep({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="mb-3">
      <p className="text-caption uppercase tracking-wide text-graphite-400">
        Step {step} of {total}
      </p>
      <h1 className="mt-0.5 text-h2 text-graphite-0">{label}</h1>
    </div>
  )
}

/** D-04/D-05 scan target. Minimum 160dp, value shown at 28sp (docs/24 §4). */
export function PdaScan({
  prompt,
  onScan,
  busy,
  autoFocus = true,
}: {
  prompt: string
  onScan: (value: string) => void
  busy?: boolean
  autoFocus?: boolean
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && !busy) ref.current?.focus()
  }, [autoFocus, busy])

  return (
    <div className="rounded-lg border-2 border-dashed border-graphite-700 bg-graphite-900 p-4">
      <div className="flex min-h-40 flex-col items-center justify-center gap-3">
        <ScanLine className={cn('size-10', busy ? 'animate-pulse text-anodic-300' : 'text-graphite-400')} aria-hidden />
        <p className="text-center text-body text-graphite-300">{busy ? 'Checking…' : prompt}</p>
        <input
          ref={ref}
          value={value}
          disabled={busy}
          inputMode="text"
          autoCapitalize="characters"
          aria-label={prompt}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              onScan(value.trim())
              setValue('')
            }
          }}
          className="w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-3 text-center font-mono text-mono-xl text-graphite-0 outline-none focus:border-anodic-400"
          placeholder="—"
        />
      </div>
      <button
        type="button"
        disabled={busy || !value.trim()}
        onClick={() => {
          onScan(value.trim())
          setValue('')
        }}
        className="mt-3 min-h-16 w-full rounded-md bg-graphite-800 text-body font-medium uppercase tracking-wide text-graphite-100 disabled:opacity-40"
      >
        Enter manually
      </button>
    </div>
  )
}

/** Large confirmed value. */
export function PdaValue({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-graphite-800 bg-graphite-900 p-4">
      <p className="text-caption uppercase tracking-wide text-graphite-400">{label}</p>
      <p className="mt-1 font-mono text-mono-xl text-graphite-0">{value}</p>
      {sub ? <p className="mt-1 text-body-sm text-graphite-400">{sub}</p> : null}
    </div>
  )
}

/** 88dp primary action, bottom-anchored. */
export function PdaButton({
  children,
  onClick,
  tone = 'primary',
  disabled,
  busy,
}: {
  children: ReactNode
  onClick: () => void
  tone?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(
        'min-h-22 w-full rounded-lg text-body font-medium uppercase tracking-wide',
        'disabled:opacity-40',
        tone === 'primary' && 'bg-anodic-600 text-graphite-0 active:bg-anodic-700',
        tone === 'danger' && 'bg-signal-dark-danger-surface text-graphite-0',
        tone === 'ghost' && 'border border-graphite-700 text-graphite-300',
      )}
    >
      {busy ? 'Committing transaction…' : children}
    </button>
  )
}

/**
 * D-08 Result (docs/24 §4) — and the single place a settled result is announced.
 *
 * Success renders only with a transaction reference — there is no optimistic
 * variant, because a success screen without one would be a lie (BRD §21). By the
 * time this mounts the server has already answered, so announcing here cannot
 * get ahead of the commit no matter which screen rendered it.
 *
 * Every PDA flow renders its outcome through this component, which is why the
 * sound and vibration live here rather than in eight separate screens.
 */
export function PdaResult({
  ok,
  title,
  reference,
  details,
  actions,
  replayed = false,
  announce = true,
  onDismiss,
  dismissAfterMs = 3000,
}: {
  ok: boolean
  title: string
  reference?: string
  details?: { label: string; value: string }[]
  actions: ReactNode
  /** True when the server replayed an earlier identical request (BR-08). */
  replayed?: boolean
  /**
   * Fire the sound and vibration. False for a result being re-read rather than
   * one that just happened — the receipt screen, for instance.
   */
  announce?: boolean
  /**
   * Continue automatically once the operator has had time to read it. Honoured
   * on success only: docs/08 §2 requires a failure to need a deliberate tap, so
   * it cannot be missed while looking away.
   */
  onDismiss?: () => void
  dismissAfterMs?: number
}) {
  // Announce once per result, not once per render. The dependency is the
  // reference rather than the object, so re-rendering the same outcome is silent
  // while a second transaction announces again.
  const announced = useRef<string | null>(null)
  const signature = `${ok ? 'ok' : 'fail'}:${reference ?? title}`

  useEffect(() => {
    if (!announce) return
    if (announced.current === signature) return

    announced.current = signature
    if (ok) pdaFeedback.success()
    else pdaFeedback.error()
  }, [announce, ok, signature])

  const autoDismiss = ok && Boolean(onDismiss)

  // Held in a ref because callers pass an inline arrow, so its identity changes
  // on every render. Depending on it directly would tear down and restart the
  // timer each time, and the three seconds would never elapse.
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    if (!autoDismiss) return

    const timer = window.setTimeout(() => dismissRef.current?.(), dismissAfterMs)
    return () => window.clearTimeout(timer)
  }, [autoDismiss, dismissAfterMs, signature])

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        'flex flex-col items-center gap-4 rounded-lg p-6 text-center',
        ok ? 'bg-signal-dark-success-surface border border-signal-dark-success-fg' : 'border border-signal-dark-danger-fg bg-signal-dark-danger-surface',
      )}
    >
      {ok ? (
        <CircleCheck className="size-16 text-signal-dark-success-fg" aria-hidden />
      ) : (
        <CircleX className="size-16 text-signal-dark-danger-fg" aria-hidden />
      )}

      <h2 className={cn('text-h1 uppercase', ok ? 'text-signal-dark-success-fg' : 'text-signal-dark-danger-fg')}>
        {title}
      </h2>

      {details?.length ? (
        <dl className="w-full text-left">
          {details.map((d) => (
            <div key={d.label} className="flex justify-between gap-3 border-b border-graphite-800 py-2">
              <dt className="text-body-sm text-graphite-300">{d.label}</dt>
              <dd className="font-mono text-mono text-graphite-0">{d.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {reference ? (
        <p className="font-mono text-mono text-graphite-300">{reference}</p>
      ) : null}

      {replayed ? (
        <p className="w-full rounded-md border border-graphite-700 p-3 text-body-sm text-graphite-300">
          This transaction was already recorded — you are seeing the original, not a second one.
        </p>
      ) : null}

      <div className="flex w-full flex-col gap-2">{actions}</div>

      {autoDismiss ? (
        <div className="w-full">
          <span
            aria-hidden
            className="block h-1 w-full overflow-hidden rounded-full bg-graphite-800"
          >
            <span
              className="block h-full rounded-full bg-signal-dark-success-fg"
              style={{
                transformOrigin: 'left',
                animation: `pda-dismiss ${dismissAfterMs}ms linear forwards`,
              }}
            />
          </span>
          <p className="mt-1.5 text-caption text-graphite-400">Continuing automatically…</p>
        </div>
      ) : null}
    </div>
  )
}

/** Structured failure: what happened, why, what next. Never auto-dismissed. */
export function PdaError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const d = (error.details ?? {}) as Record<string, string | undefined>

  const lines = [
    d['location_code'] ? { label: 'Location', value: d['location_code'] } : null,
    d['expected'] ? { label: 'Expected', value: d['expected'] } : null,
    d['scanned'] ? { label: 'Scanned', value: d['scanned'] } : null,
    d['reason'] ? { label: 'Reason', value: d['reason'] } : null,
    d['stored_at'] ? { label: 'Stored', value: formatTime(d['stored_at']) } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <PdaResult
      ok={false}
      title={titleFor(error.code, error.message)}
      details={lines}
      actions={
        <>
          <PdaButton onClick={onRetry}>Try again</PdaButton>
          <Link
            href="/pda"
            className="flex min-h-16 items-center justify-center rounded-lg border border-graphite-700 text-body uppercase text-graphite-300"
          >
            Back to home
          </Link>
        </>
      }
    />
  )
}

function titleFor(code: string, fallback: string): string {
  switch (code) {
    case 'PALLET_ALREADY_STORED':
      return 'Already stored'
    case 'PALLET_NOT_AT_LOCATION':
    case 'SOURCE_LOCATION_MISMATCH':
      return 'Wrong location'
    case 'LOCATION_BLOCKED':
      return 'Location blocked'
    case 'LOCATION_INACTIVE':
      return 'Location not in use'
    case 'PALLET_ON_HOLD':
      return 'Pallet on hold'
    case 'PALLET_ALREADY_DISPATCHED':
      return 'Already dispatched'
    case 'PALLET_NOT_FOUND':
      return 'Pallet not found'
    case 'LOCATION_NOT_FOUND':
      return 'Location not found'
    case 'PALLET_NOT_IN_INVENTORY':
      return 'Not in inventory'
    case 'UPSTREAM_UNAVAILABLE':
      return 'No connection'
    default:
      return fallback
  }
}
