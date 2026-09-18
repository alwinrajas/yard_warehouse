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
          'flex h-9.5 w-full items-center justify-between gap-2 rounded-xl border bg-graphite-0 px-3',
          'text-body-sm font-medium text-graphite-900 shadow-xs inset-shadow-[0_1px_2px_0_rgba(17,22,31,0.03)]',
          'transition-[border-color,box-shadow] duration-fast ease-standard',
          'data-[placeholder]:text-graphite-500',
          'focus-visible:border-anodic-400 focus-visible:ring-[3px] focus-visible:ring-anodic-500/15',
          hasError
            ? 'border-signal-danger-border focus-visible:border-signal-danger-fg focus-visible:ring-signal-danger-fg/15'
            : 'border-graphite-200 hover:border-graphite-300',
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
          sideOffset={6}
          className={cn(
            'anim-fade z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-xl border border-graphite-200/80 bg-graphite-0 p-1 shadow-pop',
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex cursor-default select-none items-start gap-2 rounded-lg py-2 pl-7 pr-2.5',
                  'text-body-sm font-medium text-graphite-700 outline-none transition-colors duration-fast',
                  'data-[highlighted]:bg-anodic-50 data-[highlighted]:text-anodic-800',
                  'data-[state=checked]:bg-anodic-50 data-[state=checked]:text-anodic-700 data-[state=checked]:font-semibold',
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
