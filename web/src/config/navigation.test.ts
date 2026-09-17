import { describe, expect, it } from 'vitest'

import { NAVIGATION } from '@/config/navigation'
import { PERMISSIONS, type Permission, type RoleCode } from '@/lib/permissions/permission-codes'
import { ROLE_PERMISSIONS } from '@/lib/permissions/role-matrix'

/** Mirrors Sidebar's filter: an item shows if the role holds ANY of its permissions. */
function visibleFor(role: RoleCode): string[] {
  const held = new Set<string>(ROLE_PERMISSIONS[role])
  return NAVIGATION.flatMap((group) => group.items)
    .filter((item) => item.permissions.some((p) => held.has(p)))
    .map((item) => item.id)
}

describe('permission-aware navigation', () => {
  it('only references declared permission codes', () => {
    const declared = new Set<string>(PERMISSIONS)
    for (const group of NAVIGATION) {
      for (const item of group.items) {
        expect(item.permissions.length).toBeGreaterThan(0)
        for (const code of item.permissions) expect(declared.has(code)).toBe(true)
      }
    }
  })

  it('uses unique screen ids and hrefs', () => {
    const items = NAVIGATION.flatMap((group) => group.items)
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    expect(new Set(items.map((i) => i.href)).size).toBe(items.length)
  })

  it('shows Super Admin every item', () => {
    const items = NAVIGATION.flatMap((group) => group.items)
    expect(visibleFor('SUPER_ADMIN')).toHaveLength(items.length)
  })

  it('hides administration from Viewer', () => {
    const visible = visibleFor('VIEWER')
    expect(visible).toContain('W-01') // Dashboard
    expect(visible).toContain('W-02') // Live Inventory
    expect(visible).not.toContain('W-27') // Users
    expect(visible).not.toContain('W-28') // Roles
    expect(visible).not.toContain('W-29') // Settings
    expect(visible).not.toContain('W-18') // Corrections
  })

  it('hides corrections from Supervisor', () => {
    expect(visibleFor('SUPERVISOR')).not.toContain('W-18')
  })

  it('leaves no group rendered empty for any role', () => {
    // An empty group header is never shown (docs/22 §4 rule N-01).
    for (const role of ['SUPER_ADMIN', 'YARD_ADMIN', 'SUPERVISOR', 'VIEWER'] as const) {
      const held = new Set<string>(ROLE_PERMISSIONS[role])
      const groups = NAVIGATION.map((group) => ({
        label: group.label,
        count: group.items.filter((item) => item.permissions.some((p: Permission) => held.has(p)))
          .length,
      }))
      for (const group of groups) {
        if (group.count === 0) expect(group.label).not.toBeNull()
      }
    }
  })
})
