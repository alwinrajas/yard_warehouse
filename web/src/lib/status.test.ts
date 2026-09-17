import { describe, expect, it } from 'vitest'

import { STATUS_KEYS, STATUS_TOKENS, displayStatus, statusLabel } from './status'

describe('status system', () => {
  it('covers every BRD pallet status', () => {
    expect([...STATUS_KEYS]).toEqual([
      'at-collection',
      'stored',
      'in-movement',
      'staged',
      'dispatched',
      'on-hold',
      'damaged',
      'exception',
    ])
  })

  it('keeps "Stored" visually neutral (UX-02)', () => {
    // If the state 95% of inventory is in were coloured, colour would stop
    // meaning anything. Stored must resolve to graphite, not a signal colour.
    expect(STATUS_TOKENS.stored.className).toContain('status-stored')
    expect(STATUS_TOKENS.stored.icon).toBe('Package')
  })

  it('gives every status an icon so colour is never the sole carrier', () => {
    for (const key of STATUS_KEYS) {
      expect(STATUS_TOKENS[key].icon).toBeTruthy()
      expect(STATUS_TOKENS[key].dotClassName).toBeTruthy()
    }
  })

  it('collapses the two-axis server model to one display status', () => {
    expect(displayStatus('stored', 'none')).toBe('stored')
    expect(displayStatus('stored', null)).toBe('stored')
    // A held pallet still has a location; the block state is what users see.
    expect(displayStatus('stored', 'on-hold')).toBe('on-hold')
    expect(displayStatus('staged', 'damaged')).toBe('damaged')
  })

  it('exposes the BRD status labels verbatim', () => {
    expect(statusLabel('staged')).toBe('Staged for Dispatch')
    expect(statusLabel('at-collection')).toBe('At Collection Point')
  })
})
