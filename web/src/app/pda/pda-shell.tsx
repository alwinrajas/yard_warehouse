'use client'

import { ArrowLeft, SignalHigh, SignalLow, WifiOff } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { LogoMark } from '@/components/layout/logo'
import { useConnectivity, type Connectivity } from '@/features/pda/use-connectivity'
import { useShiftElapsed } from '@/features/pda/use-shift-elapsed'
import { cn } from '@/lib/cn'
import { useSession } from '@/lib/permissions/session'

/** Dark, high-contrast chrome. Connectivity is always visible (docs/24 §7). */
export function PdaShell({ children }: { children: ReactNode }) {
  const session = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const connectivity = useConnectivity()
  const shift = useShiftElapsed(session?.signedInAt)

  const isHome = pathname === '/pda'

  return (
    <div className="flex min-h-dvh flex-col bg-graphite-950 text-graphite-50">
      <header className="flex h-14 shrink-0 items-center gap-2.5 bg-anodic-900 px-3">
        {!isHome ? (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="flex size-11 items-center justify-center rounded-md text-graphite-0 hover:bg-anodic-800"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <LogoMark flat className="size-6 text-graphite-0" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-graphite-0">
            {session?.name ?? 'ALU TRACK'}
          </p>
          <p className="truncate text-caption text-graphite-400">
            {session?.roleLabel} · {session?.siteName ?? 'All sites'}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <ConnectivityChip state={connectivity} />
          {shift ? (
            <span className="flex items-baseline gap-1 text-caption text-graphite-400">
              <span className="uppercase tracking-wide">Shift</span>
              <span className="font-mono tabular-nums text-graphite-300">{shift}</span>
              <span className="sr-only">hours, minutes and seconds since sign-in</span>
            </span>
          ) : null}
        </div>
      </header>

      {connectivity === 'offline' ? (
        <p className="bg-signal-dark-danger-surface px-3 py-2 text-body-sm text-graphite-0" role="alert">
          No connection — transactions cannot be recorded. ALU TRACK never reports a transaction as
          successful until the server confirms it.
        </p>
      ) : connectivity === 'weak' ? (
        <p className="bg-signal-dark-warning-surface px-3 py-2 text-body-sm text-graphite-0" role="status">
          Weak signal — a confirm may take longer than usual. Wait for the result rather than
          scanning again.
        </p>
      ) : null}

      <main className="flex-1 p-3">{children}</main>
    </div>
  )
}

/**
 * The connectivity chip (docs/08 §2).
 *
 * Three states, each with its own glyph as well as its own colour — the whole
 * point of the PDA feedback rules is that colour never carries meaning alone.
 */
function ConnectivityChip({ state }: { state: Connectivity }) {
  const config = {
    online: {
      icon: SignalHigh,
      label: 'Connected',
      className: 'text-graphite-300',
    },
    weak: {
      icon: SignalLow,
      label: 'Weak signal',
      className: 'bg-signal-dark-warning-surface text-graphite-0',
    },
    offline: {
      icon: WifiOff,
      label: 'No connection',
      className: 'bg-signal-dark-danger-surface text-graphite-0',
    },
  }[state]

  const Icon = config.icon

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-0.5 text-caption',
        config.className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {config.label}
    </span>
  )
}
