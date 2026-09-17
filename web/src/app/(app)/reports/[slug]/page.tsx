import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { findReport } from '@/features/reports/report-catalogue'

import { ReportViewer } from './report-viewer'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  return { title: findReport(slug)?.title ?? 'Report' }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const report = findReport(slug)
  if (!report) notFound()

  return (
    <Suspense>
      <ReportViewer slug={slug} />
    </Suspense>
  )
}
