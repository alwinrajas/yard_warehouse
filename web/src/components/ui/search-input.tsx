'use client'

import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

/**
 * Debounced search input. 250ms per docs/22 §5 — fast enough to feel live,
 * slow enough not to fire a request per keystroke across a 3,800-row table.
 */
export function SearchInput({
  value,
  onDebouncedChange,
  placeholder = 'Search…',
  debounceMs = 250,
  className,
  ariaLabel,
  autoFocus,
}: {
  value?: string
  onDebouncedChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
  ariaLabel?: string
  autoFocus?: boolean
}) {
  const [internal, setInternal] = useState(value ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const latest = useRef(onDebouncedChange)
  latest.current = onDebouncedChange

  useEffect(() => {
    setInternal(value ?? '')
  }, [value])

  useEffect(() => {
    const handle = setTimeout(() => latest.current(internal), debounceMs)
    return () => clearTimeout(handle)
  }, [internal, debounceMs])

  return (
    <div
      className={cn(
        // Deliberately the same material as <Input> — a search box and a text
        // box that look different for no reason is how a product starts to
        // feel assembled rather than designed.
        'flex h-9.5 items-center gap-2.5 rounded-xl border border-graphite-200 bg-graphite-0 px-3',
        'shadow-xs inset-shadow-[0_1px_2px_0_rgba(17,22,31,0.03)]',
        'transition-[border-color,box-shadow] duration-fast ease-standard hover:border-graphite-300',
        'focus-within:border-anodic-400 focus-within:ring-[3px] focus-within:ring-anodic-500/15',
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-graphite-400" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        value={internal}
        onChange={(event) => setInternal(event.target.value)}
        className={cn(
          'w-full bg-transparent text-body-sm text-graphite-900 outline-none',
          'placeholder:text-graphite-500 [&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      {internal ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setInternal('')
            inputRef.current?.focus()
          }}
          className="shrink-0 rounded-sm text-graphite-400 transition-colors duration-fast hover:text-graphite-700"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
