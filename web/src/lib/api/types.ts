/**
 * ALU TRACK API contract — the response envelope from docs/02 §8.
 *
 * Every endpoint returns this shape, so clients have one parser and one error
 * path. These types are hand-written for U-1 because the Laravel service does
 * not exist yet; docs/26 §4 requires them to be generated from the OpenAPI spec
 * once it does, and hand-written response types are banned from that point.
 */

export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: { pagination?: { page: number; pageSize: number; total: number } }
}

export type ApiFailure = {
  success: false
  error: {
    /** Stable, machine-readable. Drives ExceptionPanel copy (docs/25 §5). */
    code: string
    /** Operator-safe message. Shown as-is on the PDA. */
    message: string
    details?: Record<string, unknown>
    trace_id?: string
  }
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

/* ------------------------------------------------------------------ auth */

/** `POST /api/v1/auth/login` */
export const LOGIN_CHANNELS = ['WEB', 'PDA'] as const
export type LoginChannel = (typeof LOGIN_CHANNELS)[number]

export type LoginRequest = {
  username: string
  password: string
  /**
   * Which surface the session is for.
   *
   * It decides the permission required to sign in (`auth.login_web` vs
   * `auth.login_pda`) and the `channel` stamped on every transaction the session
   * records, so a scan made on the handheld surface reads as PDA in the ledger
   * and in Operator Activity — not as a console entry.
   */
  channel?: LoginChannel
  /** Recorded on every transaction (docs/04 personal_access_tokens). Web sends none. */
  device_id?: string
  device_model?: string
}

export type SessionUser = {
  user_id: string
  name: string
  username: string
  role: string
  role_label: string
  site_id: string | null
  site_name: string | null
  facilities: { id: string; code: string; name: string }[]
  permissions: string[]
  must_change_password: boolean
}

export type LoginResponse = {
  token: string
  expires_at: string
  user: SessionUser
}

/** `POST /api/v1/auth/change-password` */
export type ChangePasswordRequest = {
  current_password: string
  new_password: string
  new_password_confirmation: string
}

/* ----------------------------------------------------------- pagination */

export type Pagination = { page: number; pageSize: number; total: number; lastPage?: number }
export type Paginated<T> = { items: T[]; pagination: Pagination }

/* -------------------------------------------------------------- masters */

export type Site = {
  id: string
  code: string
  name: string
  address: string | null
  timezone: string | null
  is_active: boolean
  facility_count?: number
  created_at: string | null
  updated_at: string | null
}

export const FACILITY_TYPES = [
  'OPEN_YARD',
  'CLOSED_WAREHOUSE',
  'DISPATCH_AREA',
  'COLLECTION_AREA',
] as const
export type FacilityType = (typeof FACILITY_TYPES)[number]

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  OPEN_YARD: 'Open Yard',
  CLOSED_WAREHOUSE: 'Closed Warehouse',
  DISPATCH_AREA: 'Dispatch Area',
  COLLECTION_AREA: 'Collection Area',
}

export type Facility = {
  id: string
  site_id: string
  site_name?: string
  site_code?: string
  code: string
  name: string
  type: FacilityType
  description: string | null
  is_active: boolean
  zone_count?: number
  location_count?: number
  created_at: string | null
  updated_at: string | null
}

export type Zone = {
  id: string
  facility_id: string
  facility_name?: string
  facility_code?: string
  site_id?: string
  code: string
  name: string
  description: string | null
  sequence: number
  is_active: boolean
  location_count?: number
  created_at: string | null
  updated_at: string | null
}

export const LOCATION_TYPES = ['STORAGE', 'STAGING', 'COLLECTION', 'DISPATCH'] as const
export type LocationType = (typeof LOCATION_TYPES)[number]

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  STORAGE: 'Storage',
  STAGING: 'Staging',
  COLLECTION: 'Collection',
  DISPATCH: 'Dispatch',
}

export type LocationRecord = {
  id: string
  code: string
  description: string | null
  location_type: LocationType
  capacity: number | null
  sequence: number
  site_id: string
  facility_id: string
  facility_name?: string
  facility_type?: FacilityType
  zone_id: string | null
  zone_name?: string | null
  is_active: boolean
  is_blocked: boolean
  blocked_reason?: string | null
  blocked_remarks: string | null
  blocked_at: string | null
  /** Present when the endpoint counts inventory; absent on write responses. */
  occupied_count?: number
  /** Derived by the API; feeds LocationRef and the occupancy board. */
  state: 'empty' | 'occupied' | 'full' | 'blocked' | 'inactive'
  created_at: string | null
  updated_at: string | null
}

export type ReasonCode = {
  id: string
  code: string
  name: string
  category: string
  requires_remarks: boolean
  is_active: boolean
}

export type ImportRowError = { line: number; code: string; errors: string[] }

export type ImportBatch = {
  id: string
  type: string
  original_filename: string
  status: 'VALIDATING' | 'VALIDATED' | 'FAILED' | 'COMMITTED'
  total_rows: number
  valid_rows: number
  error_rows: number
  errors: ImportRowError[] | null
  preview?: {
    line: number
    code: string
    description: string | null
    location_type: string
    capacity: number | null
    sequence: number
  }[]
  committed_at: string | null
  created_at: string | null
}

/* --------------------------------------------------------------- errors */

/** Error codes U-1 renders specifically. Full catalogue in docs/25 §5. */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  NO_WEB_ACCESS: 'NO_WEB_ACCESS',
  PASSWORD_POLICY: 'PASSWORD_POLICY',
  CURRENT_PASSWORD_INVALID: 'CURRENT_PASSWORD_INVALID',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
} as const
