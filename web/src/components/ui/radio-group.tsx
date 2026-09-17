'use client'

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { useId } from 'react'

import { cn } from '@/lib/cn'

export type RadioOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export function RadioGroup({
  options,
  value,
  onValueChange,
  name,
  className,
  ariaLabel,
}: {
  options: RadioOption[]
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  className?: string
  ariaLabel?: string
}) {
  const base = useId()
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      name={name}
      aria-label={ariaLabel}
      className={cn('flex flex-col gap-2.5', className)}
    >
      {options.map((option) => {
        const id = `${base}-${option.value}`
        return (
          <div key={option.value} className="flex items-start gap-2.5">
            <RadioGroupPrimitive.Item
              id={id}
              value={option.value}
              disabled={option.disabled}
              className={cn(
                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                'border-graphite-300 bg-graphite-0 transition-colors duration-fast ease-standard',
                'hover:border-graphite-400 data-[state=checked]:border-anodic-600',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-anodic-600" />
            </RadioGroupPrimitive.Item>
            <label htmlFor={id} className="cursor-pointer select-none">
              <span className="block text-body-sm text-graphite-700">{option.label}</span>
              {option.description ? (
                <span className="block text-caption text-graphite-500">{option.description}</span>
              ) : null}
            </label>
          </div>
        )
      })}
    </RadioGroupPrimitive.Root>
  )
}
