/**
 * Role → permission defaults, mirroring docs/07-permission-matrix.md §3.
 *
 * STATUS: this is a client-side mirror used to render role-aware navigation
 * before a session exists, and by the development auth stub. It is NOT the
 * authority — the Laravel `PermissionRegistry` and every endpoint's policy are
 * (docs/07 §5). When the backend lands, docs/26 §9 requires this file and the
 * permission codes to be generated from it, with a test asserting every
 * role × permission pair against live endpoints.
 */
import { PERMISSIONS, type Permission, type RoleCode } from './permission-codes'

const ALL = [...PERMISSIONS]

const YARD_ADMIN_DENIED: Permission[] = [
  'site.create',
  'site.edit',
  'site.delete',
  'facility.delete',
  'zone.delete',
  'location.delete',
  'user.delete',
  'role.create',
  'role.edit',
  'role.delete',
  'settings.edit',
  'audit.export',
  'putaway.perform',
  'transfer.perform',
  'dispatch.perform',
  'dispatch.stage',
  'dispatch.override_hold',
]

const SUPERVISOR: Permission[] = [
  'auth.login_web',
  'auth.login_pda',
  'site.view',
  'facility.view',
  'zone.view',
  'location.view',
  'location.block',
  'customer.view',
  'reasoncode.view',
  'barcode.print',
  'barcode.reprint',
  'user.view',
  'scan.resolve',
  'scan.manual_override',
  'putaway.perform',
  'transfer.perform',
  'dispatch.perform',
  'dispatch.stage',
  'dispatch.override_hold',
  'hold.create',
  'hold.release',
  'openingstock.perform',
  'dashboard.view',
  'inventory.view',
  'search.perform',
  'pallet.view',
  'traceability.view',
  'transaction.view',
  'stockverify.view',
  'stockverify.create',
  'stockverify.approve',
  'report.export',
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
]

const PDA_OPERATOR: Permission[] = [
  'auth.login_pda',
  'location.view',
  'reasoncode.view',
  'scan.resolve',
  'putaway.perform',
  'transfer.perform',
  'dispatch.perform',
  'dispatch.stage',
  'inventory.view',
  'search.perform',
  'pallet.view',
  'transaction.view',
  'stockverify.view',
  'stockverify.create',
]

const VIEWER: Permission[] = [
  'auth.login_web',
  'site.view',
  'facility.view',
  'zone.view',
  'location.view',
  'customer.view',
  'dashboard.view',
  'inventory.view',
  'search.perform',
  'pallet.view',
  'traceability.view',
  'transaction.view',
  'stockverify.view',
  'report.export',
  'report.view.current_inventory',
  'report.view.location_stock',
  'report.view.job_pallet',
  'report.view.customer_lpo_stock',
  'report.view.putaway_register',
  'report.view.movement_register',
  'report.view.dispatch_register',
  'report.view.pallet_traceability',
  'report.view.ageing',
  'report.view.hold_exception',
  'report.view.daily_movement_summary',
]

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  SUPER_ADMIN: ALL,
  YARD_ADMIN: ALL.filter((p) => !YARD_ADMIN_DENIED.includes(p)),
  SUPERVISOR,
  PDA_OPERATOR,
  VIEWER,
}

/**
 * Landing route per role (docs/22 §6). PDA_OPERATOR has no web landing because
 * it has no web login at all.
 */
export const ROLE_LANDING: Record<RoleCode, string> = {
  SUPER_ADMIN: '/dashboard',
  YARD_ADMIN: '/dashboard',
  SUPERVISOR: '/dashboard',
  PDA_OPERATOR: '/login',
  VIEWER: '/dashboard',
}
