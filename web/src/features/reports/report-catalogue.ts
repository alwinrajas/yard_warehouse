/**
 * The thirteen BRD §14 reports (docs/10).
 *
 * Declarative definitions, not thirteen screens: one viewer renders them all,
 * so a new report is a row here rather than a new page.
 */
export type ReportDef = {
  slug: string
  title: string
  description: string
  group: 'Inventory' | 'Movement' | 'Control'
  /** Filters the viewer should offer. */
  filters: ('dateRange' | 'facility' | 'job' | 'pallet' | 'minAge')[]
  requiresInput?: 'pallet'
}

export const REPORTS: ReportDef[] = [
  {
    slug: 'current-inventory',
    title: 'Current Inventory',
    description: 'Every active pallet with job, customer, location, status and ageing.',
    group: 'Inventory',
    filters: ['facility', 'minAge'],
  },
  {
    slug: 'location-stock',
    title: 'Location-wise Stock',
    description: 'Inventory grouped by facility, zone and location — including empty locations.',
    group: 'Inventory',
    filters: ['facility'],
  },
  {
    slug: 'job-pallet',
    title: 'Job-wise Pallet',
    description: 'All pallets under a job number, and whether any remain after a partial dispatch.',
    group: 'Inventory',
    filters: ['job'],
  },
  {
    slug: 'customer-stock',
    title: 'Customer / LPO Stock',
    description: 'Stored pallets grouped by customer and LPO.',
    group: 'Inventory',
    filters: ['facility'],
  },
  {
    slug: 'put-away',
    title: 'Put-Away Register',
    description: 'All inbound transactions by date, operator, job, pallet and location.',
    group: 'Movement',
    filters: ['dateRange'],
  },
  {
    slug: 'movement',
    title: 'Movement Register',
    description: 'Source-to-destination history with reason, user and timestamps.',
    group: 'Movement',
    filters: ['dateRange'],
  },
  {
    slug: 'dispatch',
    title: 'Dispatch Register',
    description: 'All dispatched pallets with delivery reference, source location and operator.',
    group: 'Movement',
    filters: ['dateRange'],
  },
  {
    slug: 'traceability',
    title: 'Complete Traceability',
    description: 'The full chronological lifecycle of one pallet, from first put-away to dispatch.',
    group: 'Movement',
    filters: ['pallet'],
    requiresInput: 'pallet',
  },
  {
    slug: 'ageing',
    title: 'Ageing',
    description: 'Pallets by storage duration, in configurable buckets.',
    group: 'Inventory',
    filters: ['facility', 'minAge'],
  },
  {
    slug: 'operator-activity',
    title: 'Operator Activity',
    description: 'Transactions performed by each operator, by type.',
    group: 'Control',
    filters: ['dateRange'],
  },
  {
    slug: 'stock-verification',
    title: 'Stock Verification Variance',
    description: 'Expected against physically scanned, by location and session.',
    group: 'Control',
    filters: [],
  },
  {
    slug: 'holds',
    title: 'Holds / Exceptions',
    description: 'Pallets held, damaged or in exception, with reason and days held.',
    group: 'Control',
    filters: [],
  },
  {
    slug: 'daily-movement',
    title: 'Daily Movement Summary',
    description: 'Opening + put-away − dispatch = closing, per day, with a reconciliation check.',
    group: 'Movement',
    filters: ['dateRange'],
  },
]

export function findReport(slug: string): ReportDef | undefined {
  return REPORTS.find((r) => r.slug === slug)
}
