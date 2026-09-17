/**
 * Sortable-column registry.
 *
 * docs/26 §9 specifies a `sortable-requires-index` build check: a table column may
 * only be marked sortable if the database has a covering index for that sort, per
 * docs/04-data-model.md §5. Without this, a sortable header silently becomes a
 * full table scan that nobody notices until the yard has 50,000 pallets.
 *
 * Adding a key here is a deliberate act that should accompany a migration. The
 * check runs as a unit test (see sortable-index-registry.test.ts) and at dev time
 * inside DataTable.
 */

export const SORTABLE_INDEXES = {
  /** inventory_current ⋈ pallets — docs/04 §5 */
  inventory: [
    'putaway_at',
    'stored_at',
    'ageing_days',
    'location_code',
    'pallet_number',
    'job_number',
    'last_movement_at',
  ],

  /** pallets */
  pallets: ['pallet_number', 'job_number', 'first_putaway_at', 'last_movement_at', 'dispatched_at'],

  /** inventory_transactions — IDX(type, created_at), IDX(user_id, created_at), … */
  transactions: ['created_at', 'type', 'user_id', 'pallet_id'],

  /** locations — docs/04 §5: UNIQUE(site_id, code), IDX(facility_id, sequence) */
  locations: ['code', 'facility_id', 'zone_id', 'sequence', 'created_at'],

  /** sites — UNIQUE(code) */
  sites: ['code', 'name', 'created_at'],

  /** facilities — UNIQUE(site_id, code), IDX(type) */
  facilities: ['code', 'name', 'type', 'created_at'],

  /** zones — UNIQUE(facility_id, code), IDX(facility_id, sequence) */
  zones: ['code', 'name', 'sequence', 'created_at'],

  /** audit_logs — IDX(event, created_at), IDX(user_id, created_at) */
  audit: ['created_at', 'event', 'user_id'],

  /** stock_verifications */
  verifications: ['started_at', 'submitted_at', 'status', 'location_id'],

  /** pallet_holds — IDX(pallet_id, is_open) */
  holds: ['placed_at', 'released_at', 'hold_type'],

  /** users */
  users: ['name', 'username', 'role_id', 'last_login_at'],
} as const

export type SortableDataset = keyof typeof SORTABLE_INDEXES
export type SortableKey<D extends SortableDataset> = (typeof SORTABLE_INDEXES)[D][number]

export function isSortable(dataset: SortableDataset, key: string): boolean {
  return (SORTABLE_INDEXES[dataset] as readonly string[]).includes(key)
}

/**
 * Dev-time guard used by DataTable. Throws loudly in development so the mistake
 * is caught while the column is being written, not in production.
 */
export function assertSortable(dataset: SortableDataset, key: string): void {
  if (process.env.NODE_ENV === 'production') return
  if (!isSortable(dataset, key)) {
    throw new Error(
      `[ALU TRACK] Column "${key}" is marked sortable but "${dataset}" has no covering index for it.\n` +
        `Add a covering index (docs/04-data-model.md §5) and register the key in ` +
        `lib/table/sortable-index-registry.ts, or remove \`sortable\` from the column.`,
    )
  }
}
