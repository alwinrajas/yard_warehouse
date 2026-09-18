'use client'

import {
  Bell,
  Check,
  ChevronDown,
  Clock,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Warehouse,
} from 'lucide-react'
import Link from 'next/link'

import { appTimezone, isTimezoneUnconfirmed } from '@/lib/app-config'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'
import { useSession } from '@/lib/permissions/session'

import { CountBadge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { IconButton } from '../ui/icon-button'
import { Tooltip } from '../ui/tooltip'
import { Logo } from './logo'

/**
 * TopBar.
 *
 * The site/facility selector is a static label when the user has access to only
 * one scope, and a dropdown when they have more. A user must never be uncertain
 * which yard they are looking at (docs/22 §3.1) — and the role chip beside their
 * name means they are never uncertain which permissions they hold either.
 */
export function TopBar({
  notificationCount = 0,
  onOpenSearch,
  onOpenNav,
  onSignOut,
  signingOut,
}: {
  notificationCount?: number
  onOpenSearch?: () => void
  onOpenNav?: () => void
  onSignOut?: () => void
  signingOut?: boolean
}) {
  const session = useSession()

  return (
    <header
      style={{ height: 'var(--layout-topbar-height)' }}
      className={cn(
        'flex shrink-0 items-center gap-3.5 border-b border-graphite-200/80',
        'bg-graphite-0 px-4 sm:px-6',
      )}
    >
      {onOpenNav ? (
        <IconButton
          label="Open navigation"
          icon={<Menu className="size-4" />}
          className="md:hidden"
          onClick={onOpenNav}
        />
      ) : null}

      <Logo className="shrink-0" />

      <div className="mx-1 hidden h-6 w-px bg-graphite-200 sm:block" aria-hidden />

      {session ? (
        <ScopeSelector
          siteName={session.siteName}
          facilities={session.facilities.map((facility) => facility.name)}
        />
      ) : null}

      <button
        type="button"
        onClick={onOpenSearch}
        className={cn(
          'group ml-auto hidden h-10 w-full max-w-[30rem] items-center gap-3 rounded-xl border',
          'border-graphite-200 bg-graphite-50/70 px-3.5 text-left md:flex',
          'shadow-xs inset-shadow-[0_1px_2px_0_rgba(17,22,31,0.03)]',
          'text-body-sm text-graphite-500 transition-all duration-base ease-standard',
          'hover:border-anodic-300 hover:bg-graphite-0 hover:shadow-card',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
        )}
      >
        <Search
          className="size-4 shrink-0 text-graphite-400 transition-colors duration-fast group-hover:text-anodic-500"
          aria-hidden
        />
        <span className="flex-1 truncate">Search pallet, job, customer, location…</span>
        <kbd
          className={cn(
            'hidden shrink-0 rounded-md border border-graphite-200 bg-graphite-0 px-2 py-0.5',
            'font-mono text-caption font-medium tracking-wide text-graphite-500 shadow-xs',
            'inset-shadow-[0_1px_0_0_rgba(255,255,255,0.9)] lg:block',
          )}
        >
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
        <IconButton
          label="Search"
          icon={<Search className="size-4" />}
          className="md:hidden"
          onClick={onOpenSearch}
        />

        <div className="relative">
          <IconButton label="Notifications" icon={<Bell className="size-4" />} />
          {notificationCount > 0 ? (
            <span className="pointer-events-none absolute -right-0.5 -top-0.5">
              <CountBadge count={notificationCount} />
            </span>
          ) : null}
        </div>

        {/* Every timestamp in the product is rendered in this zone, so it is
            stated rather than assumed. Unconfirmed (CFG-13 / OI-19) reads as a
            warning; confirmed reads as quiet context. */}
        <Tooltip
          content={
            isTimezoneUnconfirmed()
              ? `Timezone is not configured (CFG-13 / OI-19). Times are shown in ${appTimezone()}.`
              : `All times are shown in ${appTimezone()}.`
          }
        >
          <span
            className={cn(
              'hidden items-center gap-1.5 rounded-lg border border-graphite-200/60 px-2.5 py-1 text-overline tracking-wider font-medium lg:inline-flex',
              isTimezoneUnconfirmed()
                ? 'bg-signal-warning-surface text-signal-warning-fg'
                : 'bg-graphite-50/60 text-graphite-600',
            )}
          >
            <Clock className="size-3 text-graphite-400" aria-hidden />
            {appTimezone()}
          </span>
        </Tooltip>

        <div className="mx-1 hidden h-6 w-px bg-graphite-200 lg:block" aria-hidden />

        {session ? (
          <UserMenu
            name={session.name}
            roleLabel={session.roleLabel}
            onSignOut={onSignOut}
            signingOut={signingOut}
          />
        ) : null}
      </div>
    </header>
  )
}

function ScopeSelector({
  siteName,
  facilities,
}: {
  siteName: string | null
  facilities: string[]
}) {
  const scopeLabel = siteName ?? 'All sites'
  const facilityLabel =
    facilities.length === 0
      ? 'All facilities'
      : facilities.length === 1
        ? facilities[0]
        : `${facilities.length} facilities`

  // A single, fixed scope is a label, not a control — a dropdown with one option
  // implies a choice the user does not have.
  if (facilities.length <= 1) {
    return (
      <span
        className={cn(
          'hidden items-center gap-2 rounded-xl border border-graphite-200/70 bg-graphite-50/60 px-3 py-1.5 sm:flex',
          'text-body-sm text-graphite-600',
        )}
      >
        <Warehouse className="size-4 shrink-0 text-anodic-600" aria-hidden />
        <span className="font-semibold text-graphite-900">{scopeLabel}</span>
        <span className="text-graphite-300" aria-hidden>
          /
        </span>
        <span className="truncate text-graphite-600">{facilityLabel}</span>
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'hidden items-center gap-2 rounded-xl border border-graphite-200/70 bg-graphite-50/80 px-3 py-1.5 text-body-sm sm:flex shadow-xs',
            'text-graphite-600 transition-all duration-fast ease-standard hover:bg-graphite-100 hover:border-graphite-300',
          )}
        >
          <Warehouse className="size-4 shrink-0 text-anodic-600" aria-hidden />
          <span className="font-semibold text-graphite-900">{scopeLabel}</span>
          <span className="text-graphite-300">/</span>
          <span>{facilityLabel}</span>
          <ChevronDown className="size-3.5 text-graphite-400" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Facility scope</DropdownMenuLabel>
        {facilities.map((facility) => (
          <DropdownMenuItem key={facility} icon={<Check className="size-3.5 opacity-0" />}>
            {facility}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu({
  name,
  roleLabel,
  onSignOut,
  signingOut,
}: {
  name: string
  roleLabel: string
  onSignOut?: () => void
  signingOut?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2.5 rounded-xl p-1.5 pr-2.5 transition-all duration-fast',
            'hover:bg-graphite-50 hover:border-graphite-200/70 focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-anodic-400',
          )}
        >
          <span
            aria-hidden
          className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          'bg-anodic-600',
            'text-overline font-semibold text-graphite-0',
          )}
          >
            {initials(name)}
          </span>
          <span className="hidden text-left lg:block">
            <span className="block text-body-sm font-medium leading-tight text-graphite-900">{name}</span>
            <span className="block text-caption leading-tight text-graphite-500">{roleLabel}</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-graphite-400" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{roleLabel}</DropdownMenuLabel>
        <DropdownMenuItem icon={<User className="size-3.5" />} asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Settings className="size-3.5" />} asChild>
          <Link href="/profile#preferences">Preferences</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          icon={<LogOut className="size-3.5" />}
          tone="danger"
          disabled={signingOut}
          onSelect={onSignOut}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
