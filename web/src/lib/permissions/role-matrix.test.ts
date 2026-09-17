import { describe, expect, it } from 'vitest'

import { PERMISSIONS, ROLE_CODES } from './permission-codes'
import { ROLE_LANDING, ROLE_PERMISSIONS } from './role-matrix'

/**
 * docs/07-permission-matrix.md §3 — the four deliberate denials, asserted
 * individually so relaxing one is always a conscious act with a failing test to
 * acknowledge (docs/07 §5).
 */
describe('role matrix', () => {
  it('covers every role', () => {
    for (const role of ROLE_CODES) {
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0)
    }
  })

  it('grants Super Admin everything', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toHaveLength(PERMISSIONS.length)
  })

  it('denies correction.perform to Supervisor and Operator', () => {
    // The BRD allows "authorized supervisors/admins"; the shipped default takes
    // the more restrictive reading. A customer may grant it deliberately in W-28.
    expect(ROLE_PERMISSIONS.SUPERVISOR).not.toContain('correction.perform')
    expect(ROLE_PERMISSIONS.PDA_OPERATOR).not.toContain('correction.perform')
    expect(ROLE_PERMISSIONS.YARD_ADMIN).toContain('correction.perform')
  })

  it('denies the scan and hold overrides to Operators', () => {
    // If an operator could self-authorise these, scan verification would be
    // optional in practice (docs/07 §3.4).
    expect(ROLE_PERMISSIONS.PDA_OPERATOR).not.toContain('scan.manual_override')
    expect(ROLE_PERMISSIONS.PDA_OPERATOR).not.toContain('dispatch.override_hold')
    expect(ROLE_PERMISSIONS.SUPERVISOR).toContain('scan.manual_override')
  })

  it('gives PDA operators no web login at all', () => {
    expect(ROLE_PERMISSIONS.PDA_OPERATOR).not.toContain('auth.login_web')
    expect(ROLE_PERMISSIONS.PDA_OPERATOR).toContain('auth.login_pda')
  })

  it('gives Viewer no PDA login and no write permission', () => {
    expect(ROLE_PERMISSIONS.VIEWER).not.toContain('auth.login_pda')
    for (const code of ['putaway.perform', 'transfer.perform', 'dispatch.perform', 'hold.create']) {
      expect(ROLE_PERMISSIONS.VIEWER).not.toContain(code)
    }
  })

  it('withholds the operator activity report from Viewer', () => {
    expect(ROLE_PERMISSIONS.VIEWER).not.toContain('report.view.operator_activity')
    expect(ROLE_PERMISSIONS.SUPERVISOR).toContain('report.view.operator_activity')
  })

  it('lets only Super Admin change what a role may do', () => {
    // Prevents an administrator escalating a role beyond their own grant.
    for (const role of ['YARD_ADMIN', 'SUPERVISOR', 'VIEWER', 'PDA_OPERATOR'] as const) {
      expect(ROLE_PERMISSIONS[role]).not.toContain('role.edit')
    }
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain('role.edit')
  })

  it('references only declared permission codes', () => {
    const declared = new Set<string>(PERMISSIONS)
    for (const role of ROLE_CODES) {
      for (const code of ROLE_PERMISSIONS[role]) expect(declared.has(code)).toBe(true)
    }
  })

  it('lands each web role somewhere it can actually reach', () => {
    for (const role of ['SUPER_ADMIN', 'YARD_ADMIN', 'SUPERVISOR', 'VIEWER'] as const) {
      expect(ROLE_LANDING[role]).toBe('/dashboard')
      expect(ROLE_PERMISSIONS[role]).toContain('dashboard.view')
    }
    expect(ROLE_LANDING.PDA_OPERATOR).toBe('/login')
  })
})
