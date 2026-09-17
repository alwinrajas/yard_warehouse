import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { NAVIGATION } from '@/config/navigation'
import { REPORTS } from '@/features/reports/report-catalogue'

const APP = join(process.cwd(), 'src', 'app')

/** Resolves a href to the route group that actually holds it on disk. */
function pageExists(href: string): boolean {
  const segments = href.replace(/^\//, '')
  return (
    existsSync(join(APP, '(app)', segments, 'page.tsx')) ||
    existsSync(join(APP, '(auth)', segments, 'page.tsx')) ||
    existsSync(join(APP, segments, 'page.tsx'))
  )
}

/**
 * Navigation promises a screen exists; this checks it actually does.
 *
 * Without this, a rename leaves the sidebar pointing at a 404 and nothing fails
 * until someone clicks it.
 */
describe('navigation targets', () => {
  it('every available item resolves to a real page', () => {
    const broken = NAVIGATION.flatMap((group) => group.items)
      .filter((item) => item.available && !pageExists(item.href))
      .map((item) => `${item.id} → ${item.href}`)

    expect(broken).toEqual([])
  })

  it('every unavailable item is honest — it has no page yet', () => {
    const lying = NAVIGATION.flatMap((group) => group.items)
      .filter((item) => !item.available && pageExists(item.href))
      .map((item) => `${item.id} → ${item.href}`)

    expect(lying).toEqual([])
  })
})

describe('PDA routes', () => {
  const PDA_ROUTES = [
    '/pda',
    '/pda/put-away',
    '/pda/movement',
    '/pda/dispatch',
    '/pda/search',
    '/pda/stock-check',
    '/pda/location-enquiry',
    '/pda/exceptions',
    '/pda/recent-activity',
    '/pda/result',
  ]

  it('every PDA screen exists', () => {
    expect(PDA_ROUTES.filter((route) => !pageExists(route))).toEqual([])
  })
})

describe('report catalogue', () => {
  it('declares the thirteen BRD §14 reports with unique slugs', () => {
    expect(REPORTS).toHaveLength(13)
    expect(new Set(REPORTS.map((r) => r.slug)).size).toBe(13)
  })

  it('matches the slugs the API accepts', () => {
    // Mirrors ReportController::REPORTS. A slug added on one side only would
    // render a report screen that 404s.
    const apiSlugs = [
      'current-inventory', 'location-stock', 'job-pallet', 'customer-stock',
      'put-away', 'movement', 'dispatch', 'traceability', 'ageing',
      'operator-activity', 'stock-verification', 'holds', 'daily-movement',
    ]

    expect(REPORTS.map((r) => r.slug).sort()).toEqual([...apiSlugs].sort())
  })

  it('asks for an input on the report that needs one', () => {
    const traceability = REPORTS.find((r) => r.slug === 'traceability')
    expect(traceability?.requiresInput).toBe('pallet')
  })
})
