/** Inventory domain DTOs (mirrors the Laravel resources). */
import type { StatusKey } from '@/lib/status'

export type DisplayStatus =
  | 'AT_COLLECTION_POINT'
  | 'STORED'
  | 'IN_MOVEMENT'
  | 'STAGED_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'ON_HOLD'
  | 'DAMAGED'
  | 'EXCEPTION'

/** Maps the API's status vocabulary onto the design-system token keys. */
export const STATUS_TOKEN: Record<DisplayStatus, StatusKey> = {
  AT_COLLECTION_POINT: 'at-collection',
  STORED: 'stored',
  IN_MOVEMENT: 'in-movement',
  STAGED_FOR_DISPATCH: 'staged',
  DISPATCHED: 'dispatched',
  ON_HOLD: 'on-hold',
  DAMAGED: 'damaged',
  EXCEPTION: 'exception',
}

export function statusKeyOf(status: string | null | undefined): StatusKey {
  return STATUS_TOKEN[(status ?? 'STORED') as DisplayStatus] ?? 'stored'
}

export type InventoryRow = {
  pallet_id: string
  pallet_number: string | null
  job_number: string | null
  customer_name: string | null
  lpo_number: string | null
  display_status: DisplayStatus
  block_state: string
  location_id: string
  location_code: string | null
  facility_id: string
  facility_name: string | null
  zone_id: string | null
  zone_name: string | null
  putaway_at: string | null
  stored_at: string | null
  last_movement_at: string | null
  last_action_by: string | null
  ageing_days: number | null
}

export type PalletDetail = {
  id: string
  pallet_key: string
  pallet_number: string | null
  job_number: string | null
  raw_barcode_value: string
  barcode_profile: string
  customer_name: string | null
  lpo_number: string | null
  lifecycle_status: string
  block_state: string
  display_status: DisplayStatus
  first_putaway_at: string | null
  last_movement_at: string | null
  dispatched_at: string | null
  ageing_days: number | null
  location?: {
    id: string
    code: string | null
    facility_name: string | null
    zone_name: string | null
    stored_at: string | null
    putaway_at: string | null
  }
}

export type TransactionRow = {
  id: string
  txn_ref: string
  type: string
  pallet_id: string
  pallet_number?: string | null
  job_number?: string | null
  source_location_code?: string | null
  destination_location_code?: string | null
  previous_lifecycle_status: string | null
  new_lifecycle_status: string | null
  previous_block_state: string | null
  new_block_state: string | null
  previous_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  reason?: string | null
  remarks: string | null
  user_id: string
  user_name?: string | null
  device_id: string | null
  channel: 'PDA' | 'WEB' | 'SYSTEM'
  correction_of_transaction_id: string | null
  created_at: string | null
}

export type HoldRow = {
  id: string
  pallet_id: string
  pallet_number?: string | null
  job_number?: string | null
  hold_type: 'HOLD' | 'DAMAGED' | 'EXCEPTION'
  reason?: string | null
  remarks: string | null
  placed_by?: string | null
  placed_at: string | null
  released_at: string | null
  release_remarks: string | null
  is_open: boolean
  days_held: number | null
}

export type OccupancyCell = {
  id: string
  code: string
  facility_id: string
  facility_name: string | null
  zone_id: string | null
  zone_name: string | null
  state: 'empty' | 'occupied' | 'full' | 'blocked' | 'inactive'
  pallet_count: number
  capacity: number | null
  is_blocked: boolean
  blocked_reason: string | null
  has_ageing_stock: boolean
}

export type OccupancyResponse = {
  locations: OccupancyCell[]
  summary: { total: number; occupied: number; empty: number; blocked: number; inactive: number }
}

export type DashboardResponse = {
  kpis: {
    total_active: number
    open_yard: number
    closed_warehouse: number
    today_putaway: number
    today_transfers: number
    today_dispatch: number
    occupied_locations: number
    empty_locations: number
    ageing_over_threshold: number
    holds_exceptions: number
    blocked_locations: number
  }
  by_facility: { name: string; total: number }[]
  by_status: { status: string; total: number }[]
  ageing: { fresh: number; normal: number; attention: number; critical: number }
  oldest_awaiting_dispatch: InventoryRow[]
}

export type StockVerificationRow = {
  id: string
  reference: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  location_id: string
  location_code?: string | null
  expected_count: number
  scanned_count: number
  matched_count: number
  missing_count: number
  unexpected_count: number
  variance: number
  started_at: string | null
  submitted_at: string | null
  reviewed_at: string | null
  review_remarks: string | null
  lines?: {
    id: string
    pallet_id: string | null
    pallet_number: string | null
    outcome: 'MATCHED' | 'MISSING' | 'UNEXPECTED'
    expected: boolean
    scanned: boolean
    system_location_code: string | null
    scanned_at: string | null
  }[]
}

export type BarcodeRow = {
  id: string
  location_id: string
  location_code?: string | null
  facility_name?: string | null
  zone_name?: string | null
  barcode_value: string
  symbology: string
  source: string
  first_printed_at: string | null
  last_printed_at: string | null
  reprint_count: number
}

export type UserRow = {
  id: string
  name: string
  username: string
  employee_code: string | null
  email: string | null
  role_id: string | null
  role_code?: string | null
  role_name?: string | null
  site_id: string | null
  site_name?: string | null
  facilities?: { id: string; code: string; name: string }[]
  is_active: boolean
  must_change_password: boolean
  last_login_at: string | null
  is_locked: boolean
}

export type AuditRow = {
  id: string
  event: string
  entity_type: string | null
  entity_id: string | null
  user_id: string | null
  user_name?: string | null
  ip_address: string | null
  device_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  context: Record<string, unknown> | null
  created_at: string | null
}

export type ReportResponse = {
  report: string
  rows: Record<string, unknown>[]
  summary: Record<string, unknown>
}
