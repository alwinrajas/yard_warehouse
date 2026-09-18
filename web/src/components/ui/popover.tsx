'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close

export function PopoverContent({
  children,
  align = 'start',
  className,
  ariaLabel,
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
  ariaLabel?: string
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={6}
        aria-label={ariaLabel}
        className={cn(
          'anim-fade z-50 rounded-xl border border-graphite-200/80 bg-graphite-0 p-3.5 shadow-pop',
          className,
        )}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}
