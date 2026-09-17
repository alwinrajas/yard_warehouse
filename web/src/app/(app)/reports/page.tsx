import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/layout/page-header'
import { Panel } from '@/components/ui'
import { REPORTS } from '@/features/reports/report-catalogue'

export const metadata: Metadata = { title: 'Reports' }

/** W-09 Reports index (docs/23 §10). */
export default function ReportsPage() {
  const groups = ['Inventory', 'Movement', 'Control'] as const

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        context="Thirteen operational reports. Every one filters, paginates and exports."
        breadcrumbs={[{ label: 'Insights' }, { label: 'Reports' }]}
      />

      {groups.map((group) => (
        <section key={group}>
          <h2 className="mb-3 text-overline uppercase text-graphite-500">{group}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {REPORTS.filter((r) => r.group === group).map((report) => (
              <Link key={report.slug} href={`/reports/${report.slug}`} className="block">
                <Panel className="h-full transition-colors duration-fast hover:border-graphite-300 hover:bg-graphite-25">
                  <h3 className="text-h3 text-graphite-800">{report.title}</h3>
                  <p className="mt-1 text-body-sm text-graphite-500">{report.description}</p>
                </Panel>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
