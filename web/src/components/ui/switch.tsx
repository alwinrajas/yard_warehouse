'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Switch — for settings that take effect immediately.
 * Never place one inside a form that has a Save button; the two models conflict
 * and the user cannot tell whether the change has been applied (docs/21 §5.1).
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
  ariaLabel,
}: {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label ? undefined : ariaLabel}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full',
          'mt-0.5 transition-colors duration-base ease-standard',
          'bg-graphite-300 data-[state=checked]:bg-anodic-600',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'block size-4 translate-x-0.5 rounded-full bg-graphite-0 shadow-e1',
            'transition-transform duration-base ease-standard data-[state=checked]:translate-x-[1.125rem]',
          )}
        />
      </SwitchPrimitive.Root>
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
