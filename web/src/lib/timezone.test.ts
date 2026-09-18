import { afterEach, describe, expect, it } from 'vitest'

import { appTimezone, isTimezoneUnconfirmed, setAppTimezone } from './app-config'
import { formatDate, formatDateTime, formatTime, timezoneLabel } from './format'

/**
 * CFG-13 / OI-19 on the client.
 *
 * The server decides the business timezone and every date in the product is
 * rendered in it. These pin the two behaviours that matter: the session's zone
 * wins over anything compiled in, and a timestamp near midnight renders on the
 * correct side of the boundary.
 *
 * A fixed instant is used throughout, so nothing depends on the machine running
 * the suite.
 */

/** 2026-03-15 19:59 UTC — 23:59 the same day in Dubai, 01:29 the 16th in Kolkata. */
const NEAR_MIDNIGHT = '2026-03-15T19:59:00.000Z'

afterEach(() => {
  setAppTimezone(null)
})

describe('timezone resolution', () => {
  it('falls back to UTC and reports itself unconfirmed before a session exists', () => {
    setAppTimezone(null)

    expect(appTimezone()).toBe('UTC')
    expect(isTimezoneUnconfirmed()).toBe(true)
  })

  it('adopts the zone the server reports for the session', () => {
    setAppTimezone('Asia/Dubai')

    expect(appTimezone()).toBe('Asia/Dubai')
    expect(isTimezoneUnconfirmed()).toBe(false)
  })

  it('ignores a blank value rather than treating it as a configured zone', () => {
    setAppTimezone('   ')

    expect(appTimezone()).toBe('UTC')
    expect(isTimezoneUnconfirmed()).toBe(true)
  })

  it('reports the zone in force, so the header can state the truth', () => {
    setAppTimezone('Asia/Kolkata')

    expect(timezoneLabel()).toBe('Asia/Kolkata')
  })
})

describe('rendering across a day boundary', () => {
  it('renders an instant on the correct calendar day for the business zone', () => {
    setAppTimezone('Asia/Dubai')
    // 23:59 on the 15th, locally.
    expect(formatDate(NEAR_MIDNIGHT)).toBe('15 Mar 2026')

    setAppTimezone('Asia/Kolkata')
    // The same instant is already 01:29 on the 16th in India.
    expect(formatDate(NEAR_MIDNIGHT)).toBe('16 Mar 2026')

    setAppTimezone('UTC')
    expect(formatDate(NEAR_MIDNIGHT)).toBe('15 Mar 2026')
  })

  it('renders the wall-clock time of the business zone, not the browser', () => {
    setAppTimezone('Asia/Dubai')
    expect(formatTime(NEAR_MIDNIGHT)).toBe('23:59')

    setAppTimezone('Asia/Kolkata')
    expect(formatTime(NEAR_MIDNIGHT)).toBe('01:29')
  })

  it('formats date and time together in the same zone', () => {
    setAppTimezone('Asia/Dubai')

    expect(formatDateTime(NEAR_MIDNIGHT)).toContain('15 Mar 2026')
    expect(formatDateTime(NEAR_MIDNIGHT)).toContain('23:59')
  })

  it('resolves per call, so a zone adopted after import is honoured', () => {
    // format.ts is imported once at module load; the session arrives later. If
    // the zone were captured at import time this would still say UTC.
    setAppTimezone('UTC')
    const before = formatTime(NEAR_MIDNIGHT)

    setAppTimezone('Asia/Dubai')
    const after = formatTime(NEAR_MIDNIGHT)

    expect(before).toBe('19:59')
    expect(after).toBe('23:59')
  })
})
