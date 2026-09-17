import {
  ArrowLeftRight,
  CircleCheck,
  CirclePause,
  Inbox,
  OctagonAlert,
  Package,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/cn'
import { STATUS_TOKENS, type StatusKey } from '@/lib/status'

/**
 * StatusBadge — the only way a pallet status is rendered.
 *
 * Always dot + icon + label: status is never carried by colour alone
 * (WCAG 1.4.1, docs/21 §2.4). Colours resolve through the generated token map,
 * so no screen can invent its own.
 *
 * Note that `stored` is deliberately neutral graphite. If the state 95% of
 * inventory is in were coloured, colour would stop meaning anything (UX-02).
 */
const ICONS: Record<string, LucideIcon> = {
  Inbox,
  Package,
  ArrowLeftRight,
  Truck,
  CircleCheck,
  CirclePause,
  TriangleAlert,
  OctagonAlert,
}

export function StatusBadge({
  status,
  size = 'sm',
  showIcon = true,
  className,
}: {
  status: StatusKey
  size?: 'sm' | 'md'
  showIcon?: boolean
  className?: string
}) {
  const token = STATUS_TOKENS[status]
  const Icon = ICONS[token.icon] ?? Package

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold shadow-xs',
        size === 'sm' ? 'px-2.5 py-0.5 text-caption' : 'px-3 py-1 text-body-sm',
        token.className,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 shrink-0 rounded-full', token.dotClassName)}
      />
      {showIcon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {token.label}
    </span>
  )
}
