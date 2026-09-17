'use client'

import { Lock } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, Badge, EmptyState, Panel, Skeleton } from '@/components/ui'
import { useApi } from '@/features/shared/use-api'
import type { SettingRow } from '@/lib/api/admin-types'
import { usePermission } from '@/lib/permissions/session'

import { SettingEditor } from './setting-editor'

/**
 * W-29 System Settings (S-41, docs/05 §7).
 *
 * The register renders itself: every row carries its own type, allowed values,
 * default and the open item it depends on, so this screen has no second copy of
 * the configuration catalogue to drift from.
 */
export function SettingsScreen() {
  const can = usePermission()
  const { data, isLoading, error, refetch } = useApi<SettingRow[]>(['settings'], '/api/proxy/settings')
  const [editing, setEditing] = useState<SettingRow | null>(null)

  const editable = can('settings.edit')
  const rows = data ?? []

  const groups = rows.reduce<Record<string, SettingRow[]>>((acc, row) => {
    ;(acc[row.group] ??= []).push(row)
    return acc
  }, {})

  const pending = rows.filter((row) => row.open_item !== null && row.is_default)

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="System Settings"
        context="Every configurable value in ALU TRACK, and what it affects"
        breadcrumbs={[{ label: 'Configuration', href: '/masters' }, { label: 'System Settings' }]}
      />

      {!editable ? (
        <Alert tone="info" title="You can read these settings but not change them">
          Changing a setting requires the System Settings edit permission.
        </Alert>
      ) : null}

      {pending.length > 0 ? (
        <Alert
          tone="warning"
          title={`${pending.length} setting${pending.length === 1 ? ' is' : 's are'} still on a placeholder default`}
        >
          Each is waiting on a customer answer (the open item is shown against the setting). The
          timezone in particular must be confirmed before go-live — a wrong value silently corrupts
          every daily figure.
        </Alert>
      ) : null}

      {isLoading ? (
        <Panel className="shadow-card">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-24 w-full" />
        </Panel>
      ) : error ? (
        <Panel padded={false} className="shadow-card">
          <EmptyState
            headingLevel={2}
            variant="error"
            title="Could not load system settings"
            description={error.message}
            errorCode={error.code}
            action={
              <button type="button" className="text-anodic-600 underline" onClick={() => void refetch()}>
                Try again
              </button>
            }
          />
        </Panel>
      ) : (
        Object.entries(groups).map(([group, settings]) => (
          <Panel key={group}>
            <h2 className="text-h3 text-graphite-800">{group}</h2>

            <ul className="mt-3 divide-y divide-graphite-200">
              {settings.map((setting) => (
                <li key={setting.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-caption text-graphite-500">
                          {setting.reference}
                        </span>
                        <span className="text-body-sm font-medium text-graphite-900">
                          {setting.key}
                        </span>
                        {setting.is_locked ? (
                          <Badge tone="warning">
                            <Lock className="mr-1 inline size-3" aria-hidden />
                            Locked
                          </Badge>
                        ) : null}
                        {setting.open_item ? <Badge tone="outline">{setting.open_item}</Badge> : null}
                        {!setting.is_default ? <Badge tone="info">Changed</Badge> : null}
                      </div>

                      <p className="mt-1 text-body-sm text-graphite-600">{setting.description}</p>

                      {setting.notes ? (
                        <p className="mt-1 text-caption text-graphite-500">{setting.notes}</p>
                      ) : null}

                      {setting.is_locked && setting.locked_reason ? (
                        <p className="mt-1 text-caption text-signal-warning-fg">
                          {setting.locked_reason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="font-mono text-mono text-graphite-900">
                          {setting.value ?? '—'}
                        </p>
                        {!setting.is_default ? (
                          <p className="text-caption text-graphite-500">
                            default {setting.default_value ?? '—'}
                          </p>
                        ) : null}
                      </div>

                      {editable && !setting.is_locked ? (
                        <button
                          type="button"
                          onClick={() => setEditing(setting)}
                          className="rounded-md border border-graphite-300 px-2.5 py-1.5 text-body-sm text-graphite-700 hover:border-anodic-400 hover:text-anodic-700"
                        >
                          Change
                        </button>
                      ) : (
                        <span className="text-caption text-graphite-500">
                          {setting.is_locked ? 'Locked' : 'Read-only'}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}

      {editing ? <SettingEditor setting={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}
