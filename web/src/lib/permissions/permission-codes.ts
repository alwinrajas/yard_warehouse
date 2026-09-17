/**
 * ALU TRACK permission codes.
 *
 * STATUS: hand-authored from docs/07-permission-matrix.md.
 *
 * This file is NOT yet generated. docs/26 §9 specifies a `permission-codes-current`
 * CI check that generates it from the Laravel `PermissionRegistry`, so that a typo
 * becomes a TypeScript error rather than a silently missing button. The backend
 * does not exist yet, so the check is wired up in U-1 alongside the API client.
 * Until then this list is kept in step with docs/07 by review.
 */

export const PERMISSIONS = [
  // Platform
  'auth.login_web',
  'auth.login_pda',
  'settings.view',
  'settings.edit',
  'audit.view',
  'audit.export',

  // Master data
  'site.view',
  'site.create',
  'site.edit',
  'site.delete',
  'facility.view',
  'facility.create',
  'facility.edit',
  'facility.delete',
  'zone.view',
  'zone.create',
  'zone.edit',
  'zone.delete',
  'location.view',
  'location.create',
  'location.edit',
  'location.delete',
  'location.import',
  'location.block',
  'customer.view',
  'customer.create',
  'customer.edit',
  'reasoncode.view',
  'reasoncode.create',
  'reasoncode.edit',
  'barcode.print',
  'barcode.reprint',

  // Users and roles
  'user.view',
  'user.create',
  'user.edit',
  'user.delete',
  'user.reset_password',
  'role.view',
  'role.create',
  'role.edit',
  'role.delete',

  // Inventory operations
  'scan.resolve',
  'scan.manual_override',
  'putaway.perform',
  'transfer.perform',
  'dispatch.perform',
  'dispatch.stage',
  'dispatch.override_hold',
  'hold.create',
  'hold.release',
  'correction.perform',
  'openingstock.perform',

  // Read side
  'dashboard.view',
  'inventory.view',
  'search.perform',
  'pallet.view',
  'pallet.import',
  'traceability.view',
  'transaction.view',
  'stockverify.view',
  'stockverify.create',
  'stockverify.approve',
  'report.export',

  // Report-level (docs/07 §3.6)
  'report.view.current_inventory',
  'report.view.location_stock',
  'report.view.job_pallet',
  'report.view.customer_lpo_stock',
  'report.view.putaway_register',
  'report.view.movement_register',
  'report.view.dispatch_register',
  'report.view.pallet_traceability',
  'report.view.ageing',
  'report.view.operator_activity',
  'report.view.verification_variance',
  'report.view.hold_exception',
  'report.view.daily_movement_summary',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLE_CODES = [
  'SUPER_ADMIN',
  'YARD_ADMIN',
  'SUPERVISOR',
  'PDA_OPERATOR',
  'VIEWER',
] as const

export type RoleCode = (typeof ROLE_CODES)[number]

export const ROLE_LABELS: Record<RoleCode, string> = {
  SUPER_ADMIN: 'Super Admin',
  YARD_ADMIN: 'Warehouse / Yard Admin',
  SUPERVISOR: 'Warehouse Supervisor',
  PDA_OPERATOR: 'Forklift / PDA Operator',
  VIEWER: 'Management / Viewer',
}
