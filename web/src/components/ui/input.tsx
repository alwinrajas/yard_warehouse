'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControlProps } from './field'

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  /** Node rendered before the field (icon, unit). */
  leading?: ReactNode
  /** Node rendered after the field (reveal toggle, spinner). */
  trailing?: ReactNode
  invalid?: boolean
  /** UX-01: render the value in the identifier face (pallet, location, txn ref). */
  mono?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, invalid, mono, disabled, ...props },
  ref,
) {
  const fieldProps = useFieldControlProps()
  const hasError = invalid || fieldProps['aria-invalid']

  return (
    <div
      className={cn(
        'flex h-9.5 items-center gap-2.5 rounded-xl border bg-graphite-0 px-3',
        'shadow-xs transition-all duration-fast ease-standard',
        'focus-within:border-anodic-400 focus-within:ring-2 focus-within:ring-anodic-100',
        hasError
          ? 'border-signal-danger-border ring-2 ring-signal-danger-surface'
          : 'border-graphite-200/90 hover:border-graphite-300',
        disabled && 'cursor-not-allowed bg-graphite-100 opacity-70',
        className,
      )}
    >
      {leading ? <span className="shrink-0 text-graphite-400">{leading}</span> : null}
      <input
        ref={ref}
        disabled={disabled}
        className={cn(
          'w-full bg-transparent text-body-sm text-graphite-900 outline-none',
          'placeholder:text-graphite-500 disabled:cursor-not-allowed',
          mono && 'font-mono text-mono',
        )}
        {...fieldProps}
        {...props}
      />
      {trailing ? <span className="shrink-0 text-graphite-400">{trailing}</span> : null}
    </div>
  )
})
