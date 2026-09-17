'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { PAGE_SIZE_OPTIONS } from '@/lib/app-config'
import { cn } from '@/lib/cn'
import { formatRange } from '@/lib/format'

import { IconButton } from './icon-button'
import { Select } from './select'

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-graphite-200 px-4 py-2.5',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {onPageSizeChange ? (
          <Select
            ariaLabel="Rows per page"
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            className="h-7 w-20"
          />
        ) : null}
        <span className="text-caption tabular-nums text-graphite-500">
          {formatRange(from, to, total)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          label="First page"
          size="sm"
          icon={<ChevronsLeft className="size-4" />}
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        />
        <IconButton
          label="Previous page"
          size="sm"
          icon={<ChevronLeft className="size-4" />}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <span className="px-2 text-caption tabular-nums text-graphite-600">
          Page {page} of {pageCount}
        </span>
        <IconButton
          label="Next page"
          size="sm"
          icon={<ChevronRight className="size-4" />}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        />
        <IconButton
          label="Last page"
          size="sm"
          icon={<ChevronsRight className="size-4" />}
          disabled={page >= pageCount}
          onClick={() => onPageChange(pageCount)}
        />
      </div>
    </nav>
  )
}
