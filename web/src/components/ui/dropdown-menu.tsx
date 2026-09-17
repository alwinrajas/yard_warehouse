'use client'

import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export const DropdownMenu = DropdownPrimitive.Root
export const DropdownMenuTrigger = DropdownPrimitive.Trigger

export function DropdownMenuContent({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={4}
        className={cn(
          'anim-fade z-50 min-w-48 overflow-hidden rounded-md border border-graphite-200',
          'bg-graphite-0 p-1 shadow-e2',
          className,
        )}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  )
}

export function DropdownMenuItem({
  children,
  onSelect,
  icon,
  disabled,
  tone = 'default',
  asChild,
}: {
  children: ReactNode
  onSelect?: () => void
  icon?: ReactNode
  disabled?: boolean
  tone?: 'default' | 'danger'
  /** Render as a Link so navigation items are real anchors, not click handlers. */
  asChild?: boolean
}) {
  if (asChild) {
    return (
      <DropdownPrimitive.Item
        asChild
        disabled={disabled}
        className={cn(
          'flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5',
          'text-body-sm text-graphite-700 outline-none',
          'data-[highlighted]:bg-graphite-50 data-[highlighted]:text-graphite-900',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        )}
      >
        <span>
          {icon}
          {children}
        </span>
      </DropdownPrimitive.Item>
    )
  }
  return (
    <DropdownPrimitive.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        'flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5',
        'text-body-sm outline-none',
        tone === 'danger'
          ? 'text-signal-danger-fg data-[highlighted]:bg-signal-danger-surface'
          : 'text-graphite-700 data-[highlighted]:bg-graphite-50 data-[highlighted]:text-graphite-900',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      )}
    >
      {icon}
      {children}
    </DropdownPrimitive.Item>
  )
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownPrimitive.Label className="px-2 py-1 text-overline uppercase text-graphite-500">
      {children}
    </DropdownPrimitive.Label>
  )
}

export function DropdownMenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-graphite-200" />
}
