import { CircleAlert, Lock, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * ExceptionPanel — the structured rejection (UX-07, docs/25 §5).
 *
 * Every rejected operation answers three questions in order:
 *   WHAT happened · WHY (the current truth) · WHAT the user can do next.
 *
 * The "why" is populated straight from the API error envelope's `details`
 * object — the server already returns the winning location, user and timestamp
 * for a conflict, so the UI's whole job is to render that as something the
 * operator can act on. "Error" with a red toast is not an explanation, and this
 * component exists so that is never what a user gets.
 */
export type ExceptionDetail = { label: string; value: ReactNode; mono?: boolean }

export function ExceptionPanel({
  title,
  description,
  details,
  comparison,
  actions,
  tone = 'danger',
  errorCode,
  traceId,
  className,
  headingLevel = 3,
}: {
  title: string
  description?: ReactNode
  /** The current truth: where the pallet actually is, who acted, when. */
  details?: ExceptionDetail[]
  /** For wrong-location/wrong-pallet: expected vs scanned, side by side. */
  comparison?: { expectedLabel?: string; expected: string; actualLabel?: string; actual: string }
  actions?: ReactNode
  tone?: 'danger' | 'warning' | 'blocked'
  errorCode?: string
  traceId?: string
  className?: string
  /** Heading level, so the panel fits the host page outline rather than forcing one. */
  headingLevel?: 2 | 3 | 4
}) {
  const Icon = tone === 'blocked' ? Lock : tone === 'warning' ? TriangleAlert : CircleAlert
  const toneClass =
    tone === 'warning'
      ? 'border-signal-warning-border bg-signal-warning-surface'
      : tone === 'blocked'
        ? 'border-graphite-300 bg-graphite-50'
        : 'border-signal-danger-border bg-signal-danger-surface'
  const Heading = `h${headingLevel}` as const
  const headingClass =
    tone === 'warning'
      ? 'text-signal-warning-fg'
      : tone === 'blocked'
        ? 'text-graphite-800'
        : 'text-signal-danger-fg'

  return (
    <div role="alert" className={cn('rounded-lg border p-4', toneClass, className)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 size-5 shrink-0', headingClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <Heading className={cn('text-h3', headingClass)}>{title}</Heading>
          {description ? (
            <p className="mt-1 text-body-sm text-graphite-700">{description}</p>
          ) : null}

          {comparison ? (
            <dl className="mt-3 overflow-hidden rounded-md border border-graphite-200 bg-graphite-0">
              <div className="flex items-baseline justify-between gap-4 border-b border-graphite-200 px-3 py-2">
                <dt className="text-overline uppercase text-graphite-500">
                  {comparison.expectedLabel ?? 'Expected'}
                </dt>
                <dd className="font-mono text-mono text-graphite-800">{comparison.expected}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-3 py-2">
                <dt className="text-overline uppercase text-graphite-500">
                  {comparison.actualLabel ?? 'Scanned'}
                </dt>
                <dd className="font-mono text-mono text-signal-danger-fg">{comparison.actual}</dd>
              </div>
            </dl>
          ) : null}

          {details?.length ? (
            <dl className="mt-3 flex flex-col gap-1.5">
              {details.map((detail) => (
                <div key={detail.label} className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-caption text-graphite-500">{detail.label}</dt>
                  <dd
                    className={cn(
                      'text-body-sm text-graphite-800',
                      detail.mono && 'font-mono text-mono',
                    )}
                  >
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {actions ? <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div> : null}

          {errorCode || traceId ? (
            <p className="mt-3 select-all text-caption text-graphite-400">
              {errorCode ? <span className="font-mono text-mono">{errorCode}</span> : null}
              {errorCode && traceId ? ' · ' : null}
              {traceId ? <span className="font-mono text-mono">{traceId}</span> : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
