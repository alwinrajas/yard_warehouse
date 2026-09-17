'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Badge } from './badge'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type ActiveFilter = { id: string; label: string; value: string }

/**
 * FilterBar — inline on lg+, a popover below that (docs/20 §7).
 *
 * Active filters render as individually removable chips with a count, so the
 * user can always see why a list looks the way it does. Filter state belongs in
 * the URL (docs/22 §4 N-02); this component only renders it.
 */
export function FilterBar({
  children,
  activeFilters = [],
  onRemoveFilter,
  onClearAll,
  className,
  trailing,
}: {
  children: ReactNode
  activeFilters?: ActiveFilter[]
  onRemoveFilter?: (id: string) => void
  onClearAll?: () => void
  className?: string
  trailing?: ReactNode
}) {
  const count = activeFilters.length

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* lg and up: filters inline */}
        <div className="hidden flex-wrap items-center gap-2 lg:flex">{children}</div>

        {/* below lg: filters in a popover */}
        <div className="lg:hidden">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                leftIcon={<SlidersHorizontal className="size-4" />}
                aria-label={count > 0 ? `Filters, ${count} active` : 'Filters'}
              >
                Filters
                {count > 0 ? <Badge tone="info">{count}</Badge> : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent ariaLabel="Filters" className="w-80">
              <div className="flex flex-col gap-3">{children}</div>
            </PopoverContent>
          </Popover>
        </div>

        {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
      </div>

      {count > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((filter) => (
            <span
              key={filter.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm border border-graphite-200',
                'bg-graphite-50 py-0.5 pl-2 pr-1 text-caption text-graphite-600',
              )}
            >
              <span className="text-graphite-500">{filter.label}:</span>
              <span className="font-medium text-graphite-800">{filter.value}</span>
              {onRemoveFilter ? (
                <button
                  type="button"
                  aria-label={`Remove filter ${filter.label}`}
                  onClick={() => onRemoveFilter(filter.id)}
                  className="rounded-sm p-0.5 text-graphite-400 hover:bg-graphite-200 hover:text-graphite-700"
                >
                  <X className="size-3" aria-hidden />
                </button>
              ) : null}
            </span>
          ))}
          {onClearAll ? (
            <Button variant="link" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
