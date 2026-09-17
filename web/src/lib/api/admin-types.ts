/** Administration contracts (S-40, S-41, S-42). */

import type { TransactionRow } from './inventory-types'

export type RoleRow = {
  id: string
  code: string
  name: string
  description: string | null
  is_system: boolean
  is_active: boolean
  permission_count?: number
  user_count?: number
  permissions?: string[]
  created_at: string | null
  updated_at: string | null
}

export type PermissionGroup = {
  module: string
  permissions: { id: string; code: string; description: string }[]
}

export type SettingType = 'STRING' | 'INT' | 'BOOL' | 'ENUM' | 'JSON'

export type SettingRow = {
  id: string
  reference: string
  key: string
  group: string
  type: SettingType
  value: string | null
  default_value: string | null
  allowed_values: string[] | null
  description: string
  notes: string | null
  open_item: string | null
  is_editable: boolean
  requires_confirmation: boolean
  is_locked: boolean
  locked_reason: string | null
  is_default: boolean
  updated_by?: string | null
  updated_at: string | null
}

export type OpeningStockStatus = {
  enabled: boolean
  setting_reference: string
  captured_count: number
  recent: TransactionRow[]
}

/** Human labels for the permission modules, so the screen does not show raw keys. */
export const PERMISSION_MODULE_LABELS: Record<string, string> = {
  auth: 'Sign-in',
  audit: 'Audit',
  barcode: 'Barcodes',
  correction: 'Corrections',
  customer: 'Customers',
  dashboard: 'Dashboard',
  dispatch: 'Dispatch',
  facility: 'Facilities',
  hold: 'Holds & exceptions',
  inventory: 'Inventory',
  location: 'Locations',
  openingstock: 'Opening stock',
  pallet: 'Pallets',
  putaway: 'Put-away',
  reasoncode: 'Reason codes',
  report: 'Reports',
  role: 'Roles',
  scan: 'Scanning',
  search: 'Search',
  settings: 'System settings',
  site: 'Sites',
  stockverify: 'Stock verification',
  traceability: 'Traceability',
  transaction: 'Transactions',
  transfer: 'Movement',
  user: 'Users',
  zone: 'Zones',
}
