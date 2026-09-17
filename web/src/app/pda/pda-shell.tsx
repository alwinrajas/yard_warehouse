'use client'

import { ArrowLeft, Wifi, WifiOff } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

import { LogoMark } from '@/components/layout/logo'
import { cn } from '@/lib/cn'
import { useSession } from '@/lib/permissions/session'

/** Dark, high-contrast chrome. Connectivity is always visible (docs/24 §7). */
export function PdaShell({ children }: { children: ReactNode }) {
  const session = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const isHome = pathname === '/pda'

  return (
    <div className="flex min-h-dvh flex-col bg-graphite-950 text-graphite-50">
      <header className="flex h-14 shrink-0 items-center gap-3 bg-anodic-900 px-3">
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
          <LogoMark className="size-6 text-graphite-0" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-graphite-0">
            {session?.name ?? 'ALU TRACK'}
          </p>
          <p className="truncate text-caption text-graphite-400">
            {session?.roleLabel} · {session?.siteName ?? 'All sites'}
          </p>
        </div>

        <span
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-caption',
            online ? 'text-graphite-300' : 'bg-signal-dark-danger-surface text-graphite-0',
          )}
        >
          {online ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
          {online ? 'Connected' : 'No connection'}
        </span>
      </header>

      {!online ? (
        <p className="bg-signal-dark-danger-surface px-3 py-2 text-body-sm text-graphite-0" role="alert">
          No connection — transactions cannot be recorded. ALU TRACK never reports a transaction as
          successful until the server confirms it.
        </p>
      ) : null}

      <main className="flex-1 p-3">{children}</main>
    </div>
  )
}
