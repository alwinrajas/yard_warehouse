'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export const TooltipProvider = TooltipPrimitive.Provider

/**
 * Tooltip. 400ms delay so it never interrupts a scan of the screen.
 * A tooltip may explain a control; it may never be the only label for one.
 *
 * Self-provides its Radix provider rather than requiring an ancestor one. A
 * shared provider would give nicer delay-grouping across a toolbar, but it also
 * means any component rendered in isolation — in a test, a drawer portal, or a
 * future Storybook — throws. Robustness wins over the grouping nicety.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 400,
  className,
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
  className?: string
}) {
  if (!content) return <>{children}</>
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'anim-fade z-50 max-w-xs rounded-lg bg-graphite-950 px-2.5 py-1.5',
            'text-caption text-graphite-100 shadow-pop',
            'ring-1 ring-graphite-0/10',
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-graphite-950" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
