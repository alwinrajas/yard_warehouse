'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn('flex items-center gap-1 border-b border-graphite-200', className)}
    >
      {children}
    </TabsPrimitive.List>
  )
}

export function TabsTrigger({
  value,
  children,
  count,
}: {
  value: string
  children: ReactNode
  count?: number
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        '-mb-px flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2',
        'text-body-sm text-graphite-500 transition-colors duration-fast ease-standard',
        'hover:text-graphite-800',
        'data-[state=active]:border-anodic-600 data-[state=active]:text-anodic-700',
        'data-[state=active]:font-medium',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
      )}
    >
      {children}
      {count !== undefined ? (
        <span className="text-caption tabular-nums text-graphite-400">{count}</span>
      ) : null}
    </TabsPrimitive.Trigger>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  return (
    <TabsPrimitive.Content value={value} className={cn('pt-4 outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  )
}
