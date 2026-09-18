'use client'

import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { NAVIGATION, type NavGroup, type NavItem } from '@/config/navigation'
import { APP_ENV, APP_VERSION } from '@/lib/app-config'
import { cn } from '@/lib/cn'
import { usePermissions } from '@/lib/permissions/session'

import { CountBadge } from '../ui/badge'
import { Tooltip } from '../ui/tooltip'

const STORAGE_KEY = 'alutrack.sidebar.collapsed'

/**
 * Sidebar.
 *
 * Light surface with a hairline border — it must not visually dominate the data
 * it sits next to (docs/22 §3.2). Items the user lacks permission for are absent,
 * never disabled; an empty group header is never shown (rule N-01).
 *
 * Badges appear on Exceptions and Stock Verification only. A sidebar of counters
 * is noise, and noise is how a genuinely urgent count gets ignored.
 */
export function Sidebar({
  badges = {},
  isAdminRole = false,
  /** Inside the mobile nav sheet the rail makes no sense — always expanded. */
  forceExpanded = false,
  onNavigate,
}: {
  badges?: Partial<Record<'exceptions' | 'verifications', number>>
  isAdminRole?: boolean
  forceExpanded?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { canAny } = usePermissions()
  const [collapsedPref, setCollapsed] = useState(false)
  const collapsed = forceExpanded ? false : collapsedPref
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (forceExpanded) return
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === 'true')
    } catch {
      /* storage unavailable — default to expanded */
    }
  }, [forceExpanded])

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const visibleGroups = NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAny(item.permissions)),
  })).filter((group) => group.items.length > 0)

  const isGroupOpen = (group: NavGroup) => {
    if (openGroups[group.id] !== undefined) return openGroups[group.id]
    if (group.collapsedByDefault) return isAdminRole
    return true
  }

  return (
    <aside
      data-collapsed={collapsed}
      style={
        forceExpanded
          ? undefined
          : { width: collapsed ? 'var(--layout-sidebar-rail)' : 'var(--layout-sidebar-expanded)' }
      }
      className={cn(
        'flex h-full min-h-0 flex-1 shrink-0 flex-col bg-surface-rail',
        !forceExpanded && 'border-r border-graphite-200/70 transition-[width] duration-base ease-standard',
      )}
    >
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group, groupIndex) => {
          const open = isGroupOpen(group)
          return (
            <div key={group.id} className={groupIndex > 0 ? 'mt-4' : undefined}>
              {group.label && !collapsed ? (
                group.collapsedByDefault ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((current) => ({ ...current, [group.id]: !open }))
                    }
                    aria-expanded={open}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5',
                      'text-overline uppercase tracking-[0.14em] text-graphite-400 transition-colors duration-fast hover:text-graphite-700',
                    )}
                  >
                    {group.label}
                    <ChevronDown
                      className={cn(
                        'size-3 transition-transform duration-fast ease-standard',
                        !open && '-rotate-90',
                      )}
                      aria-hidden
                    />
                  </button>
                ) : (
                  <p className="px-2.5 pb-1.5 text-overline uppercase tracking-[0.14em] text-graphite-400">
                    {group.label}
                  </p>
                )
              ) : null}

              {group.label && collapsed ? <div className="my-2 h-px bg-graphite-200" /> : null}

              {open || collapsed ? (
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <SidebarLink
                        item={item}
                        collapsed={collapsed}
                        active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                        badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                        onNavigate={onNavigate}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}
      </nav>

      <footer className="shrink-0 border-t border-graphite-200/70 p-3">
        <button
          type="button"
          hidden={forceExpanded}
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2.5 py-2',
            'text-body-sm text-graphite-500 transition-colors duration-fast ease-standard',
            'hover:bg-graphite-100 hover:text-graphite-800',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" aria-hidden />
              Collapse
            </>
          )}
        </button>
        {!collapsed ? (
          <p className="px-2 pt-1 text-caption text-graphite-400">
            v{APP_VERSION}
            {APP_ENV !== 'production' ? (
              <span className="ml-1.5 rounded-sm bg-signal-warning-surface px-1 text-signal-warning-fg">
                {APP_ENV}
              </span>
            ) : null}
          </p>
        ) : null}
      </footer>
    </aside>
  )
}

function SidebarLink({
  item,
  collapsed,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  active: boolean
  badge?: number
  onNavigate?: () => void
}) {
  const Icon = item.icon

  const content = (
    <span
      className={cn(
        'relative flex h-9 items-center gap-3 rounded-md px-3',
        'transition-colors duration-fast ease-standard group/navitem',
        active
          ? [
              'bg-anodic-50 font-semibold text-anodic-800',
            ]
          : item.available
            ? 'text-graphite-600 hover:bg-graphite-100/80 hover:text-graphite-900'
            : 'text-graphite-400',
        collapsed && 'justify-center px-0',
      )}
    >
      {active ? (
        <span
          aria-hidden
          className={cn(
            'absolute rounded-full bg-anodic-600',
            collapsed ? 'inset-y-2.5 -left-1 w-1' : 'inset-y-2.5 left-0 w-0.5',
          )}
        />
      ) : null}
      <Icon
        className={cn(
          'size-4 shrink-0 transition-colors duration-fast ease-standard',
          active
            ? 'text-anodic-600'
            : 'text-graphite-400 group-hover/navitem:text-graphite-700',
        )}
        aria-hidden
      />
      {!collapsed ? (
        <>
          <span className="flex-1 truncate text-body-sm">{item.label}</span>
          {badge ? <CountBadge count={badge} /> : null}
          {!item.available ? (
            <span className="rounded bg-graphite-100 px-1.5 py-0.5 text-caption text-graphite-400" aria-hidden>
              {item.increment}
            </span>
          ) : null}
        </>
      ) : null}
    </span>
  )

  // Screens that do not exist yet render as non-interactive placeholders rather
  // than links that 404. Each flips to a real link in the increment shown.
  if (!item.available) {
    const label = `${item.label} — not yet implemented (${item.increment})`
    return collapsed ? (
      <Tooltip content={label} side="right">
        <span aria-disabled className="block cursor-not-allowed">
          {content}
        </span>
      </Tooltip>
    ) : (
      <Tooltip content={label} side="right">
        <span aria-disabled className="block cursor-not-allowed">
          {content}
        </span>
      </Tooltip>
    )
  }

  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className="block"
    >
      {content}
    </Link>
  )

  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  )
}
