'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** 16px control inside a 44px hit area — comfortable with a mouse, usable on a tablet. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  indeterminate,
  className,
  ariaLabel,
}: {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  indeterminate?: boolean
  className?: string
  ariaLabel?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <CheckboxPrimitive.Root
        id={id}
        checked={indeterminate ? 'indeterminate' : checked}
        onCheckedChange={(next) => onCheckedChange?.(next === true)}
        disabled={disabled}
        aria-label={label ? undefined : ariaLabel}
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-sm border',
          'mt-0.5 transition-colors duration-fast ease-standard',
          'border-graphite-300 bg-graphite-0 hover:border-graphite-400',
          'data-[state=checked]:border-anodic-600 data-[state=checked]:bg-anodic-600',
          'data-[state=indeterminate]:border-anodic-600 data-[state=indeterminate]:bg-anodic-600',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <CheckboxPrimitive.Indicator className="text-graphite-0">
          {indeterminate ? (
            <Minus className="size-3" aria-hidden />
          ) : (
            <Check className="size-3" aria-hidden />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label ? (
        <label htmlFor={id} className="cursor-pointer select-none">
          <span className="block text-body-sm text-graphite-700">{label}</span>
          {description ? (
            <span className="block text-caption text-graphite-500">{description}</span>
          ) : null}
        </label>
      ) : null}
    </div>
  )
}
