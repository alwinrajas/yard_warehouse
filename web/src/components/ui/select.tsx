'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControlProps } from './field'

export type SelectOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  disabled,
  invalid,
  className,
  ariaLabel,
}: {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  ariaLabel?: string
}) {
  const fieldProps = useFieldControlProps()
  const hasError = invalid || fieldProps['aria-invalid']

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-graphite-0 px-2.5',
          'text-body-sm text-graphite-900 transition-colors duration-fast ease-standard',
          'data-[placeholder]:text-graphite-500',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
          hasError ? 'border-signal-danger-border' : 'border-graphite-300 hover:border-graphite-400',
          'disabled:cursor-not-allowed disabled:bg-graphite-100 disabled:opacity-70',
          className,
        )}
        {...fieldProps}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-graphite-400" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'anim-fade z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-md border border-graphite-200 bg-graphite-0 shadow-e2',
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex cursor-default select-none items-start gap-2 rounded-md py-1.5 pl-7 pr-2',
                  'text-body-sm text-graphite-700 outline-none',
                  'data-[highlighted]:bg-graphite-50 data-[highlighted]:text-graphite-900',
                  'data-[state=checked]:bg-anodic-50 data-[state=checked]:text-anodic-700',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 top-1.5">
                  <Check className="size-3.5" aria-hidden />
                </SelectPrimitive.ItemIndicator>
                <span className="flex flex-col">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.description ? (
                    <span className="text-caption text-graphite-500">{option.description}</span>
                  ) : null}
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export function SelectGroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 py-1 text-overline uppercase text-graphite-500">{children}</div>
  )
}
