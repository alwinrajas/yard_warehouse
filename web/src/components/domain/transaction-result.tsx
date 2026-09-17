import { CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { TransactionRef } from './transaction-ref'

/**
 * TransactionResult — the committed outcome.
 *
 * Rendered ONLY after the server confirms (UX-09). There is deliberately no
 * "optimistic" variant: a success screen without a transaction reference would
 * be a lie, and the BRD is explicit that success must never be shown before the
 * cloud commit (BRD §21).
 */
export type ResultDetail = { label: string; value: ReactNode; mono?: boolean }

export function TransactionResult({
  title,
  reference,
  details,
  actions,
  className,
  headingLevel = 3,
  replayed = false,
}: {
  title: string
  /** Required. If there is no reference, there was no committed transaction. */
  reference: string
  details?: ResultDetail[]
  actions?: ReactNode
  className?: string
  /** Heading level, so the result fits the host page outline rather than forcing one. */
  headingLevel?: 2 | 3 | 4
  /** True when the server replayed an earlier identical request (BR-08). */
  replayed?: boolean
}) {
  const Heading = `h${headingLevel}` as const
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'rounded-lg border border-signal-success-border bg-signal-success-surface p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-6 shrink-0 text-signal-success-fg" aria-hidden />
        <div className="min-w-0 flex-1">
          <Heading className="text-h2 text-signal-success-fg">{title}</Heading>

          {details?.length ? (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {details.map((detail) => (
                <div key={detail.label} className="min-w-0">
                  <dt className="text-overline uppercase text-graphite-500">{detail.label}</dt>
                  <dd
                    className={cn(
                      'mt-0.5 truncate text-body-sm text-graphite-800',
                      detail.mono && 'font-mono text-mono',
                    )}
                  >
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-overline uppercase text-graphite-500">Reference</span>
            <TransactionRef reference={reference} />
          </div>

          {replayed ? (
            <p className="mt-3 text-body-sm text-graphite-700">
              This transaction was already recorded. You are seeing the original — nothing was
              duplicated.
            </p>
          ) : null}

          {actions ? <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}
