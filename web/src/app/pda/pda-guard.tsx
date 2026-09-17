'use client'

import { ShieldOff } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { usePermission } from '@/lib/permissions/session'
import type { Permission } from '@/lib/permissions/permission-codes'

/**
 * Permission check at the screen, not just the tile.
 *
 * Frontend visibility is not security — the API enforces the same permission —
 * but an operator who reaches a task they cannot perform deserves to be told
 * before scanning, not after.
 */
export function PdaGuard({
  permission,
  action,
  children,
}: {
  permission: Permission
  action: string
  children: ReactNode
}) {
  const can = usePermission()

  if (!can(permission)) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-graphite-800 bg-graphite-900 p-6 text-center">
        <ShieldOff className="size-12 text-graphite-400" aria-hidden />
        <h1 className="text-h2 text-graphite-0">Not permitted</h1>
        <p className="text-body-sm text-graphite-400">
          Your role cannot {action}. Ask a supervisor if you believe this is wrong.
        </p>
        <Link
          href="/pda"
          className="flex min-h-16 w-full items-center justify-center rounded-lg border border-graphite-700 text-body uppercase text-graphite-300"
        >
          Back to home
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
