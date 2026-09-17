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
 * Corrections render as an indented branch attached to the transaction they
 * corrected — a correction is a statement *about* a transaction, never a peer
 * event in the sequence.
 */
const ICONS: Record<string, LucideIcon> = {
  PUTAWAY: Package,
  TRANSFER: ArrowLeftRight,
  DISPATCH: Truck,
  STAGE: Truck,
  HOLD: CirclePause,
  RELEASE: PlayCircle,
  MARK_DAMAGED: TriangleAlert,
  FLAG_EXCEPTION: OctagonAlert,
  CORRECTION: Wrench,
  OPENING_STOCK: Inbox,
}

const LABELS: Record<string, string> = {
  PUTAWAY: 'Put away',
  TRANSFER: 'Transferred',
  DISPATCH: 'Dispatched',
  STAGE: 'Staged for dispatch',
  HOLD: 'Placed on hold',
  RELEASE: 'Hold released',
  MARK_DAMAGED: 'Marked damaged',
  FLAG_EXCEPTION: 'Flagged as exception',
  CORRECTION: 'Correction',
  OPENING_STOCK: 'Opening stock',
}

export function Timeline({ events }: { events: TransactionRow[] }) {
  if (events.length === 0) {
    return <p className="text-body-sm text-graphite-500">No movements recorded yet.</p>
  }

  const ordered = [...events].reverse()

  return (
    <ol className="relative flex flex-col gap-0">
      {ordered.map((event, index) => {
        const Icon = ICONS[event.type] ?? CircleCheck
        const isCorrection = event.type === 'CORRECTION'
        const last = index === ordered.length - 1

        return (
          <li key={event.id} className={cn('relative flex gap-3', isCorrection && 'ml-6')}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border',
                  isCorrection
                    ? 'border-signal-warning-border bg-signal-warning-surface text-signal-warning-fg'
                    : 'border-graphite-200 bg-graphite-0 text-graphite-600',
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              {!last ? <span aria-hidden className="w-px flex-1 bg-graphite-200" /> : null}
            </div>

            <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-5')}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-body-sm font-medium text-graphite-900">
                  {LABELS[event.type] ?? event.type}
                </span>
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
                <span className="text-caption text-graphite-400">· {event.channel}</span>
              </div>

              {event.source_location_code || event.destination_location_code ? (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-mono text-graphite-700">
                  {event.source_location_code ? <span>{event.source_location_code}</span> : null}
                  {event.source_location_code && event.destination_location_code ? (
                    <span className="text-graphite-400" aria-label="moved to">
                      →
                    </span>
                  ) : null}
                  {event.destination_location_code ? (
                    <span className="text-anodic-700">{event.destination_location_code}</span>
                  ) : null}
                </p>
              ) : null}

              {event.reason || event.remarks ? (
                <p className="mt-1 text-caption text-graphite-600">
                  {[event.reason, event.remarks].filter(Boolean).join(' — ')}
                </p>
              ) : null}

              {isCorrection && event.correction_of_transaction_id ? (
                <p className="mt-1 text-caption text-signal-warning-fg">
                  Corrects an earlier transaction. The original record is unchanged.
                </p>
              ) : null}

              <p className="mt-1">
                <TransactionRef reference={event.txn_ref} />
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
