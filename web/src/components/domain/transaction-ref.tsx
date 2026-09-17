'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/cn'

/**
 * TransactionRef — a transaction reference is the operator's proof that something
 * happened, and the first thing support asks for. It is always copyable.
 */
export function TransactionRef({
  reference,
  copyable = true,
  className,
}: {
  reference: string
  copyable?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  if (!copyable) {
    return <span className={cn('font-mono text-mono text-graphite-700', className)}>{reference}</span>
  }

  return (
    <span className={cn('group inline-flex items-center gap-1.5', className)}>
      <span className="font-mono text-mono text-graphite-700">{reference}</span>
      <button
        type="button"
        aria-label={copied ? 'Reference copied' : `Copy reference ${reference}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(reference)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            /* clipboard unavailable - the value is selectable either way */
          }
        }}
        className={cn(
          'rounded-sm p-0.5 text-graphite-400 opacity-0 transition-opacity duration-fast',
          'hover:text-graphite-700 focus-visible:opacity-100 group-hover:opacity-100',
        )}
      >
        {copied ? (
          <Check className="size-3 text-signal-success-fg" aria-hidden />
        ) : (
          <Copy className="size-3" aria-hidden />
        )}
      </button>
    </span>
  )
}
