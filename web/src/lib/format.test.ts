import { describe, expect, it } from 'vitest'

import {
  ageingBucket,
  ageingInDays,
  ageingLabel,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRange,
  initials,
} from './format'

/**
 * The timezone-aware formatter is the only sanctioned way dates reach a screen.
 * These tests pin the behaviour that makes that worth enforcing.
 */
describe('format', () => {
  it('formats dates deterministically regardless of the host machine timezone', () => {
    expect(formatDate('2026-09-16T10:42:00Z')).toBe('16 Sep 2026')
    expect(formatDateTime('2026-09-16T10:42:00Z')).toBe('16 Sep 2026, 10:42')
  })

  it('returns an em dash for missing values rather than "Invalid Date"', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('not a date')).toBe('—')
  })

  it('counts ageing in calendar days', () => {
    expect(ageingInDays('2026-09-12T23:50:00Z', '2026-09-16T00:10:00Z')).toBe(4)
    expect(ageingInDays(null)).toBeNull()
  })

  it('never reports negative ageing', () => {
    expect(ageingInDays('2026-09-20T00:00:00Z', '2026-09-16T00:00:00Z')).toBe(0)
  })

  it('places ageing in the right bucket at every boundary', () => {
    expect(ageingBucket(0)).toBe('fresh')
    expect(ageingBucket(7)).toBe('fresh')
    expect(ageingBucket(8)).toBe('normal')
    expect(ageingBucket(15)).toBe('normal')
    expect(ageingBucket(16)).toBe('attention')
    expect(ageingBucket(30)).toBe('attention')
    expect(ageingBucket(31)).toBe('critical')
    expect(ageingBucket(null)).toBeNull()
  })

  it('honours configured bucket boundaries (CFG-04)', () => {
    expect(ageingBucket(10, [5, 10, 20])).toBe('normal')
    expect(ageingBucket(21, [5, 10, 20])).toBe('critical')
  })

  it('labels ageing for operators', () => {
    expect(ageingLabel(0)).toBe('today')
    expect(ageingLabel(4)).toBe('4d')
    expect(ageingLabel(null)).toBe('—')
  })

  it('formats numbers and ranges with grouping', () => {
    expect(formatNumber(3847)).toBe('3,847')
    expect(formatNumber(null)).toBe('—')
    expect(formatRange(51, 100, 3847)).toBe('51–100 of 3,847')
  })

  it('derives at most two initials', () => {
    expect(initials('Rajesh Kumar')).toBe('RK')
    expect(initials('Fatima')).toBe('F')
    expect(initials('  Ahmed  Bin  Khalid ')).toBe('AK')
    expect(initials('')).toBe('?')
  })
})
