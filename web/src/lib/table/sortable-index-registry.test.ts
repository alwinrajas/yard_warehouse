import { describe, expect, it } from 'vitest'

import { assertSortable, isSortable, SORTABLE_INDEXES } from './sortable-index-registry'

/**
 * docs/26 §9 `sortable-requires-index`.
 *
 * A sortable header without a covering index is a full table scan that nobody
 * notices until the yard holds 50,000 pallets. This is the mechanism that stops
 * one being added by accident.
 */
describe('sortable index registry', () => {
  it('accepts a key that has a covering index', () => {
    expect(isSortable('inventory', 'putaway_at')).toBe(true)
    expect(() => assertSortable('inventory', 'putaway_at')).not.toThrow()
  })

  it('rejects a key with no covering index', () => {
    expect(isSortable('inventory', 'customer_name')).toBe(false)
    expect(() => assertSortable('inventory', 'customer_name')).toThrow(/no covering index/)
  })

  it('names the fix in the error so it is actionable', () => {
    expect(() => assertSortable('transactions', 'remarks')).toThrow(
      /sortable-index-registry/,
    )
  })

  it('registers every dataset the read-side screens use', () => {
    for (const dataset of ['inventory', 'transactions', 'locations', 'audit'] as const) {
      expect(SORTABLE_INDEXES[dataset].length).toBeGreaterThan(0)
    }
  })
})
