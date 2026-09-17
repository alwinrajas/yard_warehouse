'use client'

import { useSearchParams } from 'next/navigation'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, Panel, PanelHeader, StatPanel } from '@/components/ui'
import { ROLE_LABELS } from '@/lib/permissions/permission-codes'
import { useSession } from '@/lib/permissions/session'

import { ChangePasswordForm } from './change-password-form'
import { PreferencesPanel } from './preferences-panel'

/**
 * W-24 Profile / Account (docs/23 §10).
 *
 * Read-only identity, password change, and per-viewer preferences. Role, site
 * and facility scope are deliberately NOT editable here — that is W-27 Users,
 * because a user who can widen their own scope has no scope.
 */
export function ProfileScreen({ mustChangePassword }: { mustChangePassword: boolean }) {
  const session = useSession()
  const searchParams = useSearchParams()
  const forced = mustChangePassword || searchParams.get('mustChangePassword') === '1'

  if (!session) return null

  const facilityScope =
    session.facilities.length === 0
      ? 'All facilities in this site'
      : session.facilities.map((facility) => facility.name).join(', ')

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Profile"
        context="Your ALU TRACK account, sign-in security and display preferences"
        breadcrumbs={[{ label: 'Account' }, { label: 'Profile' }]}
      />

      {forced ? (
        <Alert tone="warning" title="Choose a new password to continue" live>
          Your password was set by an administrator. Change it before using ALU TRACK.
        </Alert>
      ) : null}

      <Panel>
        <PanelHeader
          title="Identity"
          description="Role, site and facility access are managed by an administrator"
        />
        <StatPanel
          columns={2}
          stats={[
            { label: 'Name', value: session.name },
            { label: 'Username', value: session.username, mono: true },
            { label: 'Role', value: ROLE_LABELS[session.role] },
            { label: 'Site', value: session.siteName ?? 'All sites' },
            { label: 'Facility access', value: facilityScope },
            { label: 'Permissions granted', value: session.permissions.length },
          ]}
        />
      </Panel>

      <Panel>
        <PanelHeader
          title="Password"
          description="Individual credentials only — ALU TRACK accounts are never shared, so every movement traces to a real person"
        />
        <ChangePasswordForm forced={forced} />
      </Panel>

      <PreferencesPanel />
    </div>
  )
}
