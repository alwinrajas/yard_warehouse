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
              <Link key={report.slug} href={`/reports/${report.slug}`} className="group block">
                <Panel className="card-interactive h-full border-graphite-200/80 shadow-card transition-all duration-fast hover:border-anodic-300 hover:shadow-card-hover">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-h3 font-semibold text-graphite-900 transition-colors group-hover:text-anodic-600">{report.title}</h3>
                    <span className="text-graphite-400 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-anodic-600" aria-hidden>→</span>
                  </div>
                  <p className="mt-1.5 text-body-sm text-graphite-500 leading-relaxed">{report.description}</p>
                </Panel>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
