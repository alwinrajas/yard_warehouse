'use client'

import { Bell, Check, ChevronDown, LogOut, Menu, Search, Settings, User } from 'lucide-react'
import Link from 'next/link'

import { APP_TIMEZONE, IS_TIMEZONE_UNCONFIRMED } from '@/lib/app-config'
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
      className="flex shrink-0 items-center gap-3 border-b border-graphite-200 bg-graphite-0 px-4 shadow-e1"
    >
      {onOpenNav ? (
        <IconButton
          label="Open navigation"
          icon={<Menu className="size-4" />}
          className="md:hidden"
          onClick={onOpenNav}
        />
      ) : null}

      <Logo />

      <div className="mx-1 h-5 w-px bg-graphite-200" aria-hidden />

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
          'ml-auto hidden h-8 w-full max-w-[26rem] items-center gap-2 rounded-md border',
          'border-graphite-300 bg-graphite-50 px-2.5 text-left md:flex',
          'text-body-sm text-graphite-500 transition-colors duration-fast ease-standard',
          'hover:border-graphite-400 hover:bg-graphite-0',
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">Search pallet, job, customer, location…</span>
        <kbd className="rounded-sm border border-graphite-300 bg-graphite-0 px-1 text-overline text-graphite-500">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
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

        {IS_TIMEZONE_UNCONFIRMED ? (
          <Tooltip
            content={`Timezone is not configured (CFG-13 / OI-19). Times are shown in ${APP_TIMEZONE}.`}
          >
            <span className="rounded-sm bg-signal-warning-surface px-1.5 py-0.5 text-overline text-signal-warning-fg">
              {APP_TIMEZONE}
            </span>
          </Tooltip>
        ) : null}

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
      <span className="hidden items-center gap-1.5 text-body-sm text-graphite-600 sm:flex">
        <span className="font-medium text-graphite-800">{scopeLabel}</span>
        <span className="text-graphite-300">/</span>
        <span>{facilityLabel}</span>
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'hidden items-center gap-1.5 rounded-md px-2 py-1 text-body-sm sm:flex',
            'text-graphite-600 hover:bg-graphite-50',
          )}
        >
          <span className="font-medium text-graphite-800">{scopeLabel}</span>
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
            'flex items-center gap-2 rounded-md py-1 pl-1 pr-2',
            'hover:bg-graphite-50 focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-anodic-400',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full',
              'bg-anodic-100 text-overline text-anodic-800',
            )}
          >
            {initials(name)}
          </span>
          <span className="hidden text-left lg:block">
            <span className="block text-body-sm leading-tight text-graphite-800">{name}</span>
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
