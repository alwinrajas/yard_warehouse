'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { POLL_INTERVAL_MS } from '@/lib/app-config'
import { SessionProvider, type Session } from '@/lib/permissions/session'

import { ToastProvider } from '@/components/ui/toast'

/**
 * Application providers.
 *
 * Server state belongs to the query cache, view state belongs to the URL, and
 * ephemeral UI state belongs to the component. There is deliberately no global
 * client store — it would be a third source of truth for data that already has
 * two correct homes (docs/26 §3).
 */
export function Providers({
  session,
  children,
}: {
  session: Session | null
  children: ReactNode
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Lists tolerate a short staleness window; a record being acted on
            // does not, and overrides this to 0 at the call site.
            staleTime: POLL_INTERVAL_MS,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        {/* Tooltip self-provides (see components/ui/tooltip.tsx), so there is no
            TooltipProvider here — an app-level one would be dead configuration. */}
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}
