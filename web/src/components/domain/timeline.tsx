import {
  ArrowLeftRight,
  CircleCheck,
  CirclePause,
  Inbox,
  OctagonAlert,
  Package,
  PlayCircle,
  TriangleAlert,
  Truck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import type { TransactionRow } from '@/lib/api/inventory-types'

import { TransactionRef } from './transaction-ref'

/**
 * Pallet lifecycle (docs/21 §5.2).
 *
 * The journey a pallet took, newest last, so it reads downwards the way it
 * happened: collection → put-away → movement → hold → release → dispatch.
 *
 * Each event type carries its own colour, matching the status vocabulary used
 * everywhere else — a dispatch node and a "Dispatched" badge are the same
 * colour, so the timeline can be read without consulting a legend.
 *
 * Corrections render as an indented branch attached to the transaction they
 * corrected — a correction is a statement *about* a transaction, never a peer
 * event in the sequence.
 */
type EventStyle = { icon: LucideIcon; label: string; node: string; rail: string }

const EVENTS: Record<string, EventStyle> = {
  OPENING_STOCK: {
    icon: Inbox,
    label: 'Opening stock',
    node: 'border-graphite-200 bg-graphite-50 text-graphite-600',
    rail: 'bg-graphite-200',
  },
  PUTAWAY: {
    icon: Package,
    label: 'Put away',
    node: 'border-signal-success-border bg-signal-success-surface text-signal-success-fg',
    rail: 'bg-signal-success-border',
  },
  TRANSFER: {
    icon: ArrowLeftRight,
    label: 'Transferred',
    node: 'border-anodic-200 bg-anodic-50 text-anodic-600',
    rail: 'bg-anodic-200',
  },
  STAGE: {
    icon: Truck,
    label: 'Staged for dispatch',
    node: 'border-anodic-200 bg-anodic-50 text-anodic-600',
    rail: 'bg-anodic-200',
  },
  DISPATCH: {
    icon: Truck,
    label: 'Dispatched',
    node: 'border-graphite-300 bg-graphite-100 text-graphite-700',
    rail: 'bg-graphite-300',
  },
  HOLD: {
    icon: CirclePause,
    label: 'Placed on hold',
    node: 'border-signal-warning-border bg-signal-warning-surface text-signal-warning-fg',
    rail: 'bg-signal-warning-border',
  },
  RELEASE: {
    icon: PlayCircle,
    label: 'Hold released',
    node: 'border-signal-success-border bg-signal-success-surface text-signal-success-fg',
    rail: 'bg-signal-success-border',
  },
  MARK_DAMAGED: {
    icon: TriangleAlert,
    label: 'Marked damaged',
    node: 'border-signal-danger-border bg-signal-danger-surface text-signal-danger-fg',
    rail: 'bg-signal-danger-border',
  },
  FLAG_EXCEPTION: {
    icon: OctagonAlert,
    label: 'Flagged as exception',
    node: 'border-signal-danger-border bg-signal-danger-surface text-signal-danger-fg',
    rail: 'bg-signal-danger-border',
  },
  CORRECTION: {
    icon: Wrench,
    label: 'Correction',
    node: 'border-signal-warning-border bg-signal-warning-surface text-signal-warning-fg',
    rail: 'bg-signal-warning-border',
  },
}

const FALLBACK: EventStyle = {
  icon: CircleCheck,
  label: 'Transaction',
  node: 'border-graphite-200 bg-graphite-0 text-graphite-600',
  rail: 'bg-graphite-200',
}

export function Timeline({ events }: { events: TransactionRow[] }) {
  if (events.length === 0) {
    return <p className="text-body-sm text-graphite-500">No movements recorded yet.</p>
  }

  const ordered = [...events].reverse()

  return (
    <ol className="relative flex flex-col gap-0">
      {ordered.map((event, index) => {
        const style = EVENTS[event.type] ?? FALLBACK
        const Icon = style.icon
        const isCorrection = event.type === 'CORRECTION'
        const last = index === ordered.length - 1

        return (
          <li key={event.id} className={cn('relative flex gap-3', isCorrection && 'ml-6')}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border',
                  style.node,
                  last && 'ring-4 ring-graphite-100',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              {!last ? (
                <span aria-hidden className={cn('w-0.5 flex-1 rounded-full', style.rail)} />
              ) : null}
            </div>

            <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-5')}>
              <div
                className={cn(
                  'rounded-lg border p-3',
                  isCorrection
                    ? 'border-signal-warning-border bg-signal-warning-surface/50'
                    : 'border-graphite-200 bg-graphite-0',
                )}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-body-sm font-medium text-graphite-900">{style.label}</span>
                  <span className="text-caption text-graphite-500">
                    {formatDateTime(event.created_at)}
                  </span>
                  {event.user_name ? (
                    <span className="text-caption text-graphite-500">· {event.user_name}</span>
                  ) : null}
                  {event.device_id ? (
                    <span className="font-mono text-caption text-graphite-400">
                      · {event.device_id}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'ml-auto rounded-full px-1.5 py-0.5 text-overline uppercase',
                      event.channel === 'PDA'
                        ? 'bg-anodic-50 text-anodic-700'
                        : 'bg-surface-sunken text-graphite-500',
                    )}
                  >
                    {event.channel}
                  </span>
                </div>

                {event.source_location_code || event.destination_location_code ? (
                  <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-mono">
                    {event.source_location_code ? (
                      <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-graphite-600">
                        {event.source_location_code}
                      </span>
                    ) : null}
                    {event.source_location_code && event.destination_location_code ? (
                      <ArrowLeftRight
                        className="size-3.5 text-graphite-400"
                        aria-label="moved to"
                      />
                    ) : null}
                    {event.destination_location_code ? (
                      <span className="rounded bg-anodic-50 px-1.5 py-0.5 text-anodic-700">
                        {event.destination_location_code}
                      </span>
                    ) : null}
                  </p>
                ) : null}

                {event.reason || event.remarks ? (
                  <p className="mt-2 text-caption text-graphite-600">
                    {[event.reason, event.remarks].filter(Boolean).join(' — ')}
                  </p>
                ) : null}

                {isCorrection && event.correction_of_transaction_id ? (
                  <p className="mt-2 text-caption text-signal-warning-fg">
                    Corrects an earlier transaction. The original record is unchanged.
                  </p>
                ) : null}

                <p className="mt-2">
                  <TransactionRef reference={event.txn_ref} />
                </p>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
