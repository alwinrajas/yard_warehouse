'use client'

import Link from 'next/link'
import {
  Building2,
  Boxes,
  Grid3x3,
  MapPin,
  QrCode,
  Tag,
  Upload,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, Panel } from '@/components/ui'
import { usePermission } from '@/lib/permissions/session'
import type { Permission } from '@/lib/permissions/permission-codes'

type Entry = {
  href: string
  label: string
  description: string
  icon: LucideIcon
  permission: Permission
}

/**
 * W-19 Configuration home (docs/23 §10).
 *
 * The masters are ordered by the hierarchy they describe — a zone cannot exist
 * before its facility — so the page reads as the order of work, not as an
 * alphabetical list of tables.
 */
const SECTIONS: { title: string; hint: string; entries: Entry[] }[] = [
  {
    title: 'Physical hierarchy',
    hint: 'Configure top-down. Each level can only be created inside the one above it.',
    entries: [
      {
        href: '/masters/sites',
        label: 'Sites',
        description: 'The top of the hierarchy. Every other record belongs to exactly one site.',
        icon: Building2,
        permission: 'site.view',
      },
      {
        href: '/masters/facilities',
        label: 'Facilities',
        description: 'Warehouses and open yards within a site.',
        icon: Boxes,
        permission: 'facility.view',
      },
      {
        href: '/masters/zones',
        label: 'Zones',
        description: 'Optional grouping inside a facility — rows, bays, blocks.',
        icon: MapPin,
        permission: 'zone.view',
      },
      {
        href: '/masters/locations',
        label: 'Storage Locations',
        description: 'The addressable places a pallet can occupy.',
        icon: Grid3x3,
        permission: 'location.view',
      },
    ],
  },
  {
    title: 'Set-up tools',
    hint: 'Used once during commissioning, and occasionally thereafter.',
    entries: [
      {
        href: '/masters/locations/import',
        label: 'Location Import',
        description: 'Bulk-create locations from a spreadsheet, validated before anything is written.',
        icon: Upload,
        permission: 'location.import',
      },
      {
        href: '/masters/location-barcodes',
        label: 'Location Barcodes',
        description: 'Generate and reprint location labels. A reprint never changes the identity.',
        icon: QrCode,
        permission: 'barcode.print',
      },
    ],
  },
  {
    title: 'Reference data',
    hint: 'The controlled vocabulary and the people who use it.',
    entries: [
      {
        href: '/masters/reason-codes',
        label: 'Reason Codes',
        description: 'Why a hold, block or correction happened. Chosen, never typed.',
        icon: Tag,
        permission: 'reasoncode.view',
      },
      {
        href: '/masters/customers',
        label: 'Customers',
        description: 'Optional reference data for customer and LPO reporting.',
        icon: Users,
        permission: 'customer.view',
      },
      {
        href: '/users',
        label: 'Users',
        description: 'Accounts, roles and the site each user is scoped to.',
        icon: UserCog,
        permission: 'user.view',
      },
    ],
  },
]

export function MastersIndex() {
  const can = usePermission()

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Configuration"
        context="The master data every transaction is validated against"
        breadcrumbs={[{ label: 'Configuration' }]}
      />

      <Alert tone="info" title="Changes here affect every future transaction">
        Master data is not versioned per transaction — the ledger records what happened, this
        configuration decides what is allowed next. Deactivating a record never rewrites history.
      </Alert>

      {SECTIONS.map((section) => {
        const visible = section.entries.filter((entry) => can(entry.permission))
        if (visible.length === 0) return null

        return (
          <Panel key={section.title} className="shadow-card">
            <h2 className="text-h3 font-semibold text-graphite-900">{section.title}</h2>
            <p className="mt-1 text-body-sm text-graphite-500">{section.hint}</p>

            <ul className="mt-4 grid gap-3.5 sm:grid-cols-2">
              {visible.map((entry) => (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    className="group flex h-full items-start gap-3.5 rounded-xl border border-graphite-200/90 bg-graphite-0 p-4 shadow-xs transition-all duration-fast hover:border-anodic-300 hover:bg-anodic-50/40 hover:shadow-card"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-anodic-50 text-anodic-600 transition-colors group-hover:bg-anodic-600 group-hover:text-graphite-0">
                      <entry.icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold text-graphite-900 transition-colors group-hover:text-anodic-700">
                        {entry.label}
                      </span>
                      <span className="mt-0.5 block text-caption text-graphite-500 leading-relaxed">{entry.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )
      })}
    </div>
  )
}
