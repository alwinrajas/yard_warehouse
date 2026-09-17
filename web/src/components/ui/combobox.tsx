'use client'

import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControlProps } from './field'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type ComboboxOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

/**
 * Searchable single-select.
 *
 * Built for U-2, which is the first increment that needs to pick one facility
 * out of many. Plain `Select` stays the right control for short, fixed lists —
 * this one earns its complexity only when the list can grow (docs/21 §5.1).
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches.',
  disabled,
  invalid,
  clearable,
  className,
  ariaLabel,
}: {
  options: ComboboxOption[]
  value?: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  invalid?: boolean
  clearable?: boolean
  className?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const listboxId = useId()
  const fieldProps = useFieldControlProps()
  const hasError = invalid || fieldProps['aria-invalid']

  const selected = options.find((option) => option.value === value) ?? null

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.description?.toLowerCase().includes(needle),
    )
  }, [options, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-graphite-0 px-2.5',
            'text-left text-body-sm transition-colors duration-fast ease-standard',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
            hasError ? 'border-signal-danger-border' : 'border-graphite-300 hover:border-graphite-400',
            'disabled:cursor-not-allowed disabled:bg-graphite-100 disabled:opacity-70',
            className,
          )}
          {...fieldProps}
        >
          <span className={cn('truncate', selected ? 'text-graphite-900' : 'text-graphite-500')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-graphite-400" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <div className="flex items-center gap-2 border-b border-graphite-200 px-2.5 py-2">
          <Search className="size-4 shrink-0 text-graphite-400" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full bg-transparent text-body-sm outline-none placeholder:text-graphite-500"
          />
        </div>

        <ul id={listboxId} role="listbox" className="max-h-64 overflow-y-auto p-1">
          {clearable && selected ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onValueChange(null)
                  setOpen(false)
                }}
                className="w-full rounded-md px-2 py-1.5 text-left text-body-sm text-graphite-500 hover:bg-graphite-50"
              >
                Clear selection
              </button>
            </li>
          ) : null}

          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-body-sm text-graphite-500">{emptyMessage}</li>
          ) : (
            filtered.map((option) => {
              const isSelected = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => {
                      onValueChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left',
                      'text-body-sm outline-none',
                      isSelected
                        ? 'bg-anodic-50 text-anodic-700'
                        : 'text-graphite-700 hover:bg-graphite-50 hover:text-graphite-900',
                      'disabled:pointer-events-none disabled:opacity-50',
                    )}
                  >
                    <Check
                      className={cn('mt-0.5 size-3.5 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-caption text-graphite-500">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
