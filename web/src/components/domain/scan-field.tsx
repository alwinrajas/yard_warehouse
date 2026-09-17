'use client'

import { CircleCheck, ScanLine, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Spinner } from '../ui/spinner'

/**
 * Barcode entry (docs/21 §5.2).
 *
 * Auto-focused and submit-on-Enter, which is what a scan gun produces. The
 * resolved value is shown large and monospaced so a misread is obvious before
 * the operator commits.
 */
export function ScanField({
  label,
  placeholder,
  onScan,
  resolving,
  resolved,
  error,
  onClear,
  disabled,
  autoFocus = true,
}: {
  label: string
  placeholder?: string
  onScan: (value: string) => void
  resolving?: boolean
  /** Rendered when the scan resolved — usually a PalletIdentity or LocationRef. */
  resolved?: ReactNode
  error?: ReactNode
  onClear?: () => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!resolved && autoFocus && !disabled) inputRef.current?.focus()
  }, [resolved, autoFocus, disabled])

  if (resolved) {
    return (
      <div className="anim-rise rounded-xl border border-signal-success-border bg-signal-success-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-signal-success-fg" aria-hidden />
            <div className="min-w-0">
              <p className="text-overline uppercase text-graphite-500">{label}</p>
              <div className="mt-1">{resolved}</div>
            </div>
          </div>
          {onClear ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue('')
                onClear()
              }}
              leftIcon={<X className="size-3.5" />}
            >
              Change
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border-2 border-dashed p-5',
        'transition-all duration-fast ease-standard',
        error
          ? 'border-signal-danger-border bg-signal-danger-surface/40'
          : 'border-graphite-300/80 bg-graphite-50/70 focus-within:border-anodic-400 focus-within:bg-graphite-0 focus-within:ring-4 focus-within:ring-anodic-50',
      )}
    >
      <label className="flex items-center gap-2 text-label font-semibold text-graphite-800">
        <ScanLine className="size-4 text-anodic-600" aria-hidden />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          mono
          value={value}
          disabled={disabled || resolving}
          placeholder={placeholder ?? 'Scan or type the barcode'}
          leading={resolving ? <Spinner className="size-4" /> : <ScanLine className="size-4" />}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && value.trim()) {
              event.preventDefault()
              onScan(value.trim())
            }
          }}
          className="flex-1"
        />
        <Button
          variant="secondary"
          disabled={disabled || resolving || !value.trim()}
          onClick={() => onScan(value.trim())}
        >
          {resolving ? 'Checking…' : 'Check'}
        </Button>
      </div>
      <p className={cn('text-caption', error ? 'sr-only' : 'text-graphite-500')}>
        Scan with the barcode reader, or type the code and press Enter.
      </p>
      {error}
    </div>
  )
}
