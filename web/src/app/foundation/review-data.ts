/**
 * REVIEW FIXTURES — design-system gallery only.
 *
 * This file exists so the U-0 foundation can be looked at. It is imported by
 * `/foundation` and by nothing else. It is NOT mock data standing in for an API:
 * no application screen imports it, and no production flow reads it (docs/27,
 * "no mock data in production flows").
 *
 * Values are obviously synthetic and prefixed so they can never be mistaken for
 * customer data.
 */
import type { Session } from '@/lib/permissions/session'
import { PERMISSIONS } from '@/lib/permissions/permission-codes'
import type { LocationSummary } from '@/components/domain/location-ref'
import type { Pallet } from '@/components/domain/pallet-identity'
import type { StatusKey } from '@/lib/status'

export const REVIEW_SESSION: Session = {
  userId: 'review-user',
  name: 'Design Review',
  username: 'review',
  role: 'SUPER_ADMIN',
  roleLabel: 'Super Admin',
  siteId: 'review-site',
  siteName: 'DEMO Plant',
  facilities: [
    { id: 'f1', code: 'YD-A', name: 'DEMO Open Yard A' },
    { id: 'f2', code: 'WH-B', name: 'DEMO Warehouse B' },
  ],
  permissions: [...PERMISSIONS],
}

export const REVIEW_LOCATIONS: LocationSummary[] = [
  {
    id: 'l1',
    code: 'YD-A-03-018',
    facilityName: 'DEMO Open Yard A',
    zoneName: 'Zone A',
    state: 'occupied',
    palletCount: 1,
    capacity: 2,
  },
  {
    id: 'l2',
    code: 'WH-B-02-011',
    facilityName: 'DEMO Warehouse B',
    zoneName: 'Zone 02',
    state: 'empty',
    palletCount: 0,
    capacity: 2,
  },
  {
    id: 'l3',
    code: 'YD-A-05-002',
    facilityName: 'DEMO Open Yard A',
    zoneName: 'Zone A',
    state: 'blocked',
  },
  {
    id: 'l4',
    code: 'YD-A-07-014',
    facilityName: 'DEMO Open Yard A',
    zoneName: 'Zone C',
    state: 'inactive',
  },
]

export type ReviewRow = {
  id: string
  pallet: Pallet
  location: LocationSummary
  status: StatusKey
  ageingDays: number
  putAwayAt: string
  lastUser: string
}

export const REVIEW_ROWS: ReviewRow[] = [
  {
    id: 'r1',
    pallet: {
      id: 'p1',
      palletNumber: 'DEMO-PAL-10245',
      jobNumber: 'DEMO-JOB-8817',
      customerName: 'DEMO Gulf Aluminium',
      lpoNumber: 'DEMO-LPO-44912',
      status: 'stored',
    },
    location: REVIEW_LOCATIONS[0]!,
    status: 'stored',
    ageingDays: 4,
    putAwayAt: '2026-09-12T08:14:00Z',
    lastUser: 'R. Kumar',
  },
  {
    id: 'r2',
    pallet: {
      id: 'p2',
      palletNumber: 'DEMO-PAL-10246',
      jobNumber: 'DEMO-JOB-8817',
      customerName: 'DEMO Gulf Aluminium',
      lpoNumber: 'DEMO-LPO-44912',
      status: 'staged',
    },
    location: REVIEW_LOCATIONS[1]!,
    status: 'staged',
    ageingDays: 11,
    putAwayAt: '2026-09-05T11:02:00Z',
    lastUser: 'A. Khan',
  },
  {
    id: 'r3',
    pallet: {
      id: 'p3',
      palletNumber: 'DEMO-PAL-10102',
      jobNumber: 'DEMO-JOB-8790',
      customerName: 'DEMO Emirates Extrusion',
      lpoNumber: 'DEMO-LPO-44810',
      status: 'on-hold',
    },
    location: REVIEW_LOCATIONS[1]!,
    status: 'on-hold',
    ageingDays: 22,
    putAwayAt: '2026-08-25T09:40:00Z',
    lastUser: 'Q. Hassan',
  },
  {
    id: 'r4',
    pallet: {
      id: 'p4',
      palletNumber: 'DEMO-PAL-09912',
      jobNumber: 'DEMO-JOB-8401',
      customerName: 'DEMO Falcon Profiles',
      lpoNumber: null,
      status: 'damaged',
    },
    location: REVIEW_LOCATIONS[0]!,
    status: 'damaged',
    ageingDays: 47,
    putAwayAt: '2026-07-31T14:20:00Z',
    lastUser: 'M. Iqbal',
  },
  {
    id: 'r5',
    pallet: {
      id: 'p5',
      palletNumber: 'DEMO-PAL-10301',
      jobNumber: 'DEMO-JOB-8822',
      customerName: 'DEMO Gulf Aluminium',
      lpoNumber: 'DEMO-LPO-44930',
      status: 'in-movement',
    },
    location: REVIEW_LOCATIONS[0]!,
    status: 'in-movement',
    ageingDays: 1,
    putAwayAt: '2026-09-15T16:05:00Z',
    lastUser: 'R. Kumar',
  },
]
