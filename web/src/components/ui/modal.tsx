'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

const SIZES = {
  sm: 'max-w-[25rem]',
  md: 'max-w-[35rem]',
  lg: 'max-w-[45rem]',
} as const

/**
 * Modal — for confirmations and short forms only.
 * Record detail belongs in a Drawer so the list behind it keeps its filters (UX-05).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  children,
  hideClose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  size?: keyof typeof SIZES
  footer?: ReactNode
  children?: ReactNode
  hideClose?: boolean
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-40 bg-graphite-950/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            'anim-scale fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded-2xl border border-graphite-200/70 bg-graphite-0 shadow-pop',
            SIZES[size],
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-graphite-200/70 px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-h2 text-graphite-900">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-body-sm text-graphite-500">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            {!hideClose ? (
              <DialogPrimitive.Close
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 text-graphite-400 transition-colors duration-fast hover:bg-graphite-100 hover:text-graphite-700"
              >
                <X className="size-4" aria-hidden />
              </DialogPrimitive.Close>
            ) : null}
          </header>

          {children ? <div className="px-5 py-4">{children}</div> : null}

          {footer ? (
            <footer className="flex items-center justify-end gap-2 border-t border-graphite-200/70 bg-graphite-25 px-5 py-3.5">
              {footer}
            </footer>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
