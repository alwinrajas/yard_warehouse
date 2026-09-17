import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PERMISSIONS } from '@/lib/permissions/permission-codes'
import { SessionProvider, type Session } from '@/lib/permissions/session'

import { PermissionGate } from './permission-gate'

function makeSession(permissions: Session['permissions']): Session {
  return {
    userId: 'u1',
    name: 'Test User',
    username: 'test',
    role: 'SUPERVISOR',
    roleLabel: 'Warehouse Supervisor',
    siteId: 's1',
    siteName: 'Test Site',
    facilities: [],
    permissions,
  }
}

function renderWith(permissions: Session['permissions'], ui: React.ReactNode) {
  return render(<SessionProvider session={makeSession(permissions)}>{ui}</SessionProvider>)
}

describe('PermissionGate', () => {
  it('renders children when the permission is held', () => {
    renderWith(['transfer.perform'], (
      <PermissionGate permission="transfer.perform">
        <button>Transfer</button>
      </PermissionGate>
    ))
    expect(screen.getByRole('button', { name: 'Transfer' })).toBeInTheDocument()
  })

  it('renders nothing when the permission is absent — not a disabled control', () => {
    renderWith(['inventory.view'], (
      <PermissionGate permission="transfer.perform">
        <button>Transfer</button>
      </PermissionGate>
    ))
    expect(screen.queryByRole('button', { name: 'Transfer' })).not.toBeInTheDocument()
  })

  it('renders the fallback so a direct URL never yields a blank page', () => {
    renderWith([], (
      <PermissionGate permission="correction.perform" fallback={<p>Not permitted</p>}>
        <button>Correct</button>
      </PermissionGate>
    ))
    expect(screen.getByText('Not permitted')).toBeInTheDocument()
  })

  it('supports anyOf and allOf', () => {
    renderWith(['hold.create'], (
      <PermissionGate anyOf={['hold.create', 'hold.release']}>
        <p>Any</p>
      </PermissionGate>
    ))
    expect(screen.getByText('Any')).toBeInTheDocument()

    renderWith(['hold.create'], (
      <PermissionGate allOf={['hold.create', 'hold.release']} fallback={<p>Blocked</p>}>
        <p>All</p>
      </PermissionGate>
    ))
    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('keeps the permission list in step with the documented matrix', () => {
    // docs/07 §3 — the four deliberate denials must exist as codes so the
    // matrix can be enforced once the backend registry generates this file.
    for (const code of [
      'correction.perform',
      'scan.manual_override',
      'dispatch.override_hold',
      'openingstock.perform',
    ] as const) {
      expect(PERMISSIONS).toContain(code)
    }
  })
})
