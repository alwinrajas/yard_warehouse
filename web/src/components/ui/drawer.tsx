'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Drawer — the standard surface for record detail (UX-05).
 *
 * Opens over the list so filters, sort and scroll position survive. Becomes a
 * full-screen sheet below `md` (docs/20 §7).
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  subtitle,
  header,
  footer,
  children,
  size = 'md',
  side = 'right',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  subtitle?: ReactNode
  /** Replaces the default title block — used for hero identity headers. */
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  size?: 'md' | 'lg'
  /** Right for record detail (UX-05); left is used only by the mobile nav sheet. */
  side?: 'right' | 'left'
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-40 bg-graphite-950/30" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 z-50 flex w-full flex-col bg-graphite-0 shadow-e3',
            side === 'right'
              ? 'anim-slide-right right-0 border-l border-graphite-200'
              : 'anim-slide-left left-0 max-w-[var(--layout-sidebar-expanded)] border-r border-graphite-200',
            side === 'right' &&
              (size === 'lg'
                ? 'md:w-[var(--layout-drawer-lg)]'
                : 'md:w-[var(--layout-drawer-md)]'),
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-graphite-200 px-5 py-4">
            <div className="min-w-0 flex-1">
              {header ?? (
                <>
                  <DialogPrimitive.Title className="text-h2 text-graphite-800">
                    {title}
                  </DialogPrimitive.Title>
                  {subtitle ? (
                    <DialogPrimitive.Description className="mt-0.5 text-body-sm text-graphite-500">
                      {subtitle}
                    </DialogPrimitive.Description>
                  ) : null}
                </>
              )}
              {header ? (
                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close panel"
              className="shrink-0 rounded-md p-1 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-700"
            >
              <X className="size-4" aria-hidden />
            </DialogPrimitive.Close>
          </header>

          <div className="flex-1 overflow-y-auto">{children}</div>

          {footer ? (
            <footer className="flex items-center justify-end gap-2 border-t border-graphite-200 px-5 py-3">
              {footer}
            </footer>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
