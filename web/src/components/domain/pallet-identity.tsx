import { cn } from '@/lib/cn'
import type { StatusKey } from '@/lib/status'

import { StatusBadge } from './status-badge'

/**
 * PalletIdentity — the canonical way a pallet is named anywhere in ALU TRACK.
 *
 * UX-01: the pallet number is monospaced with tabular, slashed-zero figures.
 * `PAL-10245` and `PAL-1O245` must never be confusable — a misread here sends a
 * forklift to the wrong pallet.
 */
export type Pallet = {
  id: string
  palletNumber: string
  jobNumber?: string | null
  customerName?: string | null
  lpoNumber?: string | null
  status?: StatusKey
}

export function PalletIdentity({
  pallet,
  variant = 'inline',
  showStatus = true,
  className,
}: {
  pallet: Pallet
  variant?: 'inline' | 'stacked' | 'hero'
  showStatus?: boolean
  className?: string
}) {
  if (variant === 'hero') {
    return (
      <div className={cn('min-w-0', className)}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-mono-lg text-graphite-900">{pallet.palletNumber}</span>
          {showStatus && pallet.status ? <StatusBadge status={pallet.status} size="md" /> : null}
        </div>
        <p className="mt-1 truncate text-body-sm text-graphite-500">
          {[pallet.jobNumber, pallet.customerName, pallet.lpoNumber].filter(Boolean).join(' · ') ||
            'No job details recorded'}
        </p>
      </div>
    )
  }

  if (variant === 'stacked') {
    return (
      <div className={cn('min-w-0', className)}>
        <span className="block font-mono text-mono text-graphite-900">{pallet.palletNumber}</span>
        {pallet.jobNumber ? (
          <span className="block truncate text-caption text-graphite-500">{pallet.jobNumber}</span>
        ) : null}
      </div>
    )
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <span className="font-mono text-mono text-graphite-900">{pallet.palletNumber}</span>
      {pallet.jobNumber ? (
        <span className="truncate text-caption text-graphite-500">{pallet.jobNumber}</span>
      ) : null}
      {showStatus && pallet.status ? <StatusBadge status={pallet.status} /> : null}
    </span>
  )
}
