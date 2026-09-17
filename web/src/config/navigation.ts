/**
 * ALU TRACK navigation.
 *
 * Grouped by what the user is trying to do, not by which table backs the screen
 * (docs/22 §1). A generic "Masters" bucket of ten CRUD screens is the signature of
 * an admin template; here the masters sit under Configuration, ordered by the
 * hierarchy they describe.
 *
 * `available` marks screens that exist. The few that remain false render as
 * non-interactive placeholders rather than dead links that 404, and each names
 * the increment that delivers it (docs/27 §3).
 */
import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  ClipboardCheck,
  FileText,
  Grid3x3,
  LayoutDashboard,
  Package,
  PackagePlus,
  ArrowRightLeft,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  TriangleAlert,
  Users,
  Wrench,
  Building2,
  MapPin,
  QrCode,
  Tag,
  UserCog,
  Boxes as BoxesIcon,
  History,
  Layers,
} from 'lucide-react'

import type { Permission } from '@/lib/permissions/permission-codes'

export type NavItem = {
  /** Screen ID from docs/23-web-screens.md */
  id: string
  label: string
  href: string
  icon: LucideIcon
  /** Any one of these grants visibility (docs/22 §6 rule N-01). */
  permissions: Permission[]
  available: boolean
  increment: string
  /** Shows a count badge when the user has items awaiting action. */
  badgeKey?: 'exceptions' | 'verifications'
}

export type NavGroup = {
  id: string
  label: string | null
  items: NavItem[]
  /** Collapsed by default for non-administrative roles (docs/22 §3.2). */
  collapsedByDefault?: boolean
}

export const NAVIGATION: NavGroup[] = [
  {
    id: 'overview',
    label: null,
    items: [
      {
        id: 'W-01',
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        permissions: ['dashboard.view'],
        available: true,
        increment: 'U-9',
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      {
        id: 'W-02',
        label: 'Live Inventory',
        href: '/inventory',
        icon: Boxes,
        permissions: ['inventory.view'],
        available: true,
        increment: 'U-4',
      },
      {
        id: 'W-03',
        label: 'Pallets',
        href: '/pallets',
        icon: Package,
        permissions: ['pallet.view'],
        available: true,
        increment: 'U-4',
      },
      {
        id: 'W-04',
        label: 'Location Occupancy',
        href: '/location-occupancy',
        icon: Grid3x3,
        permissions: ['inventory.view'],
        available: true,
        increment: 'U-9',
      },
      {
        id: 'W-05',
        label: 'Locations',
        href: '/locations',
        icon: MapPin,
        permissions: ['location.view'],
        available: true,
        increment: 'U-9',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'W-12',
        label: 'Put-Away',
        href: '/transactions/put-away',
        icon: Package,
        permissions: ['putaway.perform'],
        available: true,
        increment: 'U-5',
      },
      {
        id: 'W-13',
        label: 'Location Movement',
        href: '/transactions/movement',
        icon: ArrowRightLeft,
        permissions: ['transfer.perform'],
        available: true,
        increment: 'U-7',
      },
      {
        id: 'W-14',
        label: 'Dispatch',
        href: '/transactions/dispatch',
        icon: Truck,
        permissions: ['dispatch.perform'],
        available: true,
        increment: 'U-8',
      },
      {
        id: 'W-15',
        label: 'Stock Verification',
        href: '/stock-verification',
        icon: ClipboardCheck,
        permissions: ['stockverify.view'],
        available: true,
        increment: 'U-11',
        badgeKey: 'verifications',
      },
      {
        id: 'W-17',
        label: 'Exceptions & Holds',
        href: '/holds-exceptions',
        icon: TriangleAlert,
        permissions: ['hold.create', 'hold.release', 'inventory.view'],
        available: true,
        increment: 'U-10',
        badgeKey: 'exceptions',
      },
      {
        id: 'W-18',
        label: 'Corrections',
        href: '/corrections',
        icon: Wrench,
        permissions: ['correction.perform'],
        available: true,
        increment: 'U-12',
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      {
        id: 'W-07',
        label: 'Transactions',
        href: '/transactions',
        icon: History,
        permissions: ['transaction.view'],
        available: true,
        increment: 'U-10',
      },
      {
        id: 'W-09',
        label: 'Reports',
        href: '/reports',
        icon: FileText,
        permissions: ['report.export', 'report.view.current_inventory'],
        available: true,
        increment: 'U-13',
      },
      {
        id: 'W-11',
        label: 'Audit Log',
        href: '/audit',
        icon: ScrollText,
        permissions: ['audit.view'],
        available: true,
        increment: 'U-13',
      },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    collapsedByDefault: true,
    items: [
      {
        id: 'W-19',
        label: 'Configuration Home',
        href: '/masters',
        icon: Layers,
        permissions: ['site.view', 'facility.view', 'zone.view', 'location.view'],
        available: true,
        increment: 'U-2',
      },
      {
        id: 'W-20',
        label: 'Sites',
        href: '/masters/sites',
        icon: Building2,
        permissions: ['site.view'],
        available: true,
        increment: 'U-2',
      },
      {
        id: 'W-21',
        label: 'Facilities',
        href: '/masters/facilities',
        icon: BoxesIcon,
        permissions: ['facility.view'],
        available: true,
        increment: 'U-2',
      },
      {
        id: 'W-22',
        label: 'Zones',
        href: '/masters/zones',
        icon: MapPin,
        permissions: ['zone.view'],
        available: true,
        increment: 'U-2',
      },
      {
        id: 'W-23',
        label: 'Storage Locations',
        href: '/masters/locations',
        icon: Grid3x3,
        permissions: ['location.view'],
        available: true,
        increment: 'U-2',
      },
      {
        id: 'W-23b',
        label: 'Location Barcodes',
        href: '/masters/location-barcodes',
        icon: QrCode,
        permissions: ['barcode.print'],
        available: true,
        increment: 'U-3',
      },
      {
        id: 'W-25',
        label: 'Customers',
        href: '/masters/customers',
        icon: Users,
        permissions: ['customer.view'],
        available: true,
        increment: 'U-14',
      },
      {
        id: 'W-26',
        label: 'Reason Codes',
        href: '/masters/reason-codes',
        icon: Tag,
        permissions: ['reasoncode.view'],
        available: true,
        increment: 'U-14',
      },
      {
        id: 'W-27',
        label: 'Users',
        href: '/users',
        icon: UserCog,
        permissions: ['user.view'],
        available: true,
        increment: 'U-14',
      },
      {
        id: 'W-28',
        label: 'Roles & Permissions',
        href: '/masters/roles',
        icon: ShieldCheck,
        permissions: ['role.view'],
        available: true,
        increment: 'U-16',
      },
      {
        id: 'W-29',
        label: 'System Settings',
        href: '/settings',
        icon: Settings,
        permissions: ['settings.view'],
        available: true,
        increment: 'U-16',
      },
      {
        id: 'W-30',
        label: 'Opening Stock',
        href: '/opening-stock',
        icon: PackagePlus,
        permissions: ['openingstock.perform'],
        available: true,
        increment: 'U-15',
      },
    ],
  },
]
