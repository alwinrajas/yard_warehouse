'use client'

import { Columns3, Download, Rows3 } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Button } from './button'
import type { TableDensity } from './data-table-types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { IconButton } from './icon-button'
import { SearchInput } from './search-input'

const DENSITY_LABEL: Record<TableDensity, string> = {
  compact: 'Compact',
  default: 'Default',
  comfortable: 'Comfortable',
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  density,
  onDensityChange,
  columnToggles,
  onExport,
  canExport = true,
  children,
  className,
}: {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  density?: TableDensity
  onDensityChange?: (density: TableDensity) => void
  columnToggles?: { id: string; label: string; visible: boolean; onToggle: () => void }[]
  onExport?: () => void
  canExport?: boolean
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {onSearchChange ? (
          <SearchInput
            value={searchValue}
            onDebouncedChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="w-full max-w-72"
          />
        ) : null}
        {children}
      </div>

      <div className="flex items-center gap-1.5">
        {onDensityChange && density ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label="Row density" icon={<Rows3 className="size-4" />} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Row density</DropdownMenuLabel>
              {(Object.keys(DENSITY_LABEL) as TableDensity[]).map((option) => (
                <DropdownMenuItem key={option} onSelect={() => onDensityChange(option)}>
                  {DENSITY_LABEL[option]}
                  {density === option ? (
                    <span className="ml-auto text-caption text-anodic-600">current</span>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {columnToggles?.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label="Columns" icon={<Columns3 className="size-4" />} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              {columnToggles.map((column) => (
                <DropdownMenuItem key={column.id} onSelect={column.onToggle}>
                  {column.label}
                  {column.visible ? (
                    <span className="ml-auto text-caption text-anodic-600">shown</span>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {onExport && canExport ? (
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Download className="size-4" />}
            onClick={onExport}
          >
            Export
          </Button>
        ) : null}
      </div>
    </div>
  )
}
