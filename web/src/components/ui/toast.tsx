'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Toast — for background events only: an export finished, a preference saved.
 *
 * Inventory errors are NEVER toasts. A rejected transaction renders as an inline
 * ExceptionPanel carrying the current truth and real next actions (UX-07), because
 * a message that disappears after five seconds is not an explanation.
 */
export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export type ToastMessage = {
  id: string
  tone: ToastTone
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

const TONE_ICON = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert }

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'border-signal-info-border bg-signal-info-surface text-signal-info-fg',
  success: 'border-signal-success-border bg-signal-success-surface text-signal-success-fg',
  warning: 'border-signal-warning-border bg-signal-warning-surface text-signal-warning-fg',
  danger: 'border-signal-danger-border bg-signal-danger-surface text-signal-danger-fg',
}

type ToastContextValue = { toast: (message: Omit<ToastMessage, 'id'>) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const toast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setMessages((current) => [...current, { ...message, id }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((m) => m.id !== id))
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider duration={5000} swipeDirection="right">
        {children}
        {messages.map((message) => {
          const Icon = TONE_ICON[message.tone]
          return (
            <ToastPrimitive.Root
              key={message.id}
              onOpenChange={(open) => !open && dismiss(message.id)}
              className={cn(
                'anim-fade flex items-start gap-3 rounded-lg border p-3 shadow-e2',
                TONE_CLASS[message.tone],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <ToastPrimitive.Title className="text-body-sm font-medium">
                  {message.title}
                </ToastPrimitive.Title>
                {message.description ? (
                  <ToastPrimitive.Description className="mt-0.5 text-caption opacity-90">
                    {message.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              {message.action ? (
                <ToastPrimitive.Action
                  altText={message.action.label}
                  onClick={message.action.onClick}
                  className="shrink-0 text-caption font-medium underline underline-offset-2"
                >
                  {message.action.label}
                </ToastPrimitive.Action>
              ) : null}
              <ToastPrimitive.Close aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">
                <X className="size-3.5" aria-hidden />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          )
        })}
        <ToastPrimitive.Viewport className="fixed right-4 top-4 z-[60] flex w-80 flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
