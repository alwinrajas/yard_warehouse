'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { useSession } from '@/lib/permissions/session'

import { Drawer } from '../ui/drawer'
import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'

/**
 * AppShell.
 *
 * The shell is fluid; only the content region is max-width constrained, so a 4K
 * monitor shows more rows rather than more empty margin (docs/20 §7).
 */
export function AppShell({
  children,
  badges,
  notificationCount,
  onOpenSearch,
  onSignOut,
  signingOut,
  banner,
  contentClassName,
}: {
  children: ReactNode
  badges?: Partial<Record<'exceptions' | 'verifications', number>>
  notificationCount?: number
  onOpenSearch?: () => void
  onSignOut?: () => void
  signingOut?: boolean
  /** Full-width notice above the content — used for the dev-auth warning. */
  banner?: ReactNode
  contentClassName?: string
}) {
  const session = useSession()
  const isAdminRole = session?.role === 'SUPER_ADMIN' || session?.role === 'YARD_ADMIN'
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="flex h-dvh flex-col bg-graphite-50">
      <a href="#main-content" className="skip-link rounded-md bg-anodic-600 px-3 py-2 text-graphite-0">
        Skip to content
      </a>

      <TopBar
        notificationCount={notificationCount}
        onOpenSearch={onOpenSearch}
        onOpenNav={() => setNavOpen(true)}
        onSignOut={onSignOut}
        signingOut={signingOut}
      />

      {banner}

      {/* Below md the sidebar becomes an overlay sheet (docs/22 §3.2) — the
          console must not be navigable only on a desktop-width screen. */}
      <Drawer open={navOpen} onOpenChange={setNavOpen} side="left" title="Navigation">
        <Sidebar
          badges={badges}
          isAdminRole={isAdminRole}
          forceExpanded
          onNavigate={() => setNavOpen(false)}
        />
      </Drawer>

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar badges={badges} isAdminRole={isAdminRole} />
        </div>

        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto">
          <div className={cn('mx-auto w-full max-w-[var(--layout-content-max)] p-6', contentClassName)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
