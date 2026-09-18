import { FileX, Inbox, Lock, PackageOpen, SearchX, TriangleAlert } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Empty, error and forbidden states.
 *
 * "No data" is where most enterprise UIs stop helping. Every variant here
 * distinguishes *why* the view is empty and offers the matching action (UX-10).
 *
 * The icon sits in a soft tile rather than floating on the surface: it gives the
 * state a centre of gravity, so an empty panel still looks considered rather
 * than broken.
 */
export type EmptyStateVariant =
  | 'no-data'
  | 'no-results'
  | 'location-empty'
  | 'not-started'
  | 'error'
  | 'forbidden'

const VARIANT: Record<
  EmptyStateVariant,
  { icon: ComponentType<{ className?: string }>; tile: string; glyph: string }
> = {
  'no-data': {
    icon: Inbox,
    tile: 'border-graphite-200/80 bg-gradient-to-b from-graphite-50 to-graphite-100/70',
    glyph: 'text-graphite-400',
  },
  'no-results': {
    icon: SearchX,
    tile: 'border-graphite-200/80 bg-gradient-to-b from-graphite-50 to-graphite-100/70',
    glyph: 'text-graphite-400',
  },
  'location-empty': {
    icon: PackageOpen,
    tile: 'border-graphite-200/80 bg-gradient-to-b from-graphite-50 to-graphite-100/70',
    glyph: 'text-graphite-400',
  },
  'not-started': {
    icon: FileX,
    tile: 'border-graphite-200/80 bg-gradient-to-b from-graphite-50 to-graphite-100/70',
    glyph: 'text-graphite-400',
  },
  error: {
    icon: TriangleAlert,
    tile: 'border-signal-danger-border/80 bg-gradient-to-b from-signal-danger-surface to-signal-danger-surface/60',
    glyph: 'text-signal-danger-fg',
  },
  forbidden: {
    icon: Lock,
    tile: 'border-graphite-200/80 bg-gradient-to-b from-graphite-50 to-graphite-100/70',
    glyph: 'text-graphite-400',
  },
}

export function EmptyState({
  variant = 'no-data',
  title,
  description,
  action,
  secondaryAction,
  /** For `forbidden`: named so the user can quote it when requesting access. */
  permission,
  errorCode,
  traceId,
  className,
  compact,
  headingLevel = 3,
}: {
  variant?: EmptyStateVariant
  title: string
  description?: ReactNode
  action?: ReactNode
  secondaryAction?: ReactNode
  permission?: string
  errorCode?: string
  traceId?: string
  className?: string
  compact?: boolean
  /**
   * Heading level, so the component slots into the host page's outline instead
   * of forcing one. Defaults to 3 (inside a panel under an h1/h2 page title).
   */
  headingLevel?: 2 | 3 | 4
}) {
  const { icon: Icon, tile, glyph } = VARIANT[variant]
  const Heading = `h${headingLevel}` as const

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-9' : 'px-6 py-16',
        className,
      )}
      role={variant === 'error' ? 'alert' : undefined}
    >
      <span
        aria-hidden
        className={cn(
          'flex items-center justify-center rounded-2xl border shadow-xs',
          compact ? 'size-11' : 'size-14',
          tile,
        )}
      >
        <Icon className={cn(compact ? 'size-5' : 'size-6', glyph)} />
      </span>

      <Heading className="mt-4 text-h3 text-graphite-900">{title}</Heading>
      {description ? (
        <p className="mt-1.5 max-w-md text-body-sm text-graphite-500">{description}</p>
      ) : null}

      {permission ? (
        <p className="mt-2 text-caption text-graphite-500">
          Required permission:{' '}
          <span className="font-mono text-mono text-graphite-700">{permission}</span>
        </p>
      ) : null}

      {errorCode || traceId ? (
        <p className="mt-2 select-all text-caption text-graphite-400">
          {errorCode ? <span className="font-mono text-mono">{errorCode}</span> : null}
          {errorCode && traceId ? ' · ' : null}
          {traceId ? <span className="font-mono text-mono">{traceId}</span> : null}
        </p>
      ) : null}

      {action || secondaryAction ? (
        <div className="mt-5 flex items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}
