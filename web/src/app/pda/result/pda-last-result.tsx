'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { PdaResult } from '../pda-ui'
import { readReceipt, type PdaReceipt } from '@/features/pda/last-result'
import { formatDateTime } from '@/lib/format'

/**
 * The receipt for the last confirmed transaction on this device.
 *
 * It only ever displays a transaction the server already confirmed; if there is
 * none it says so, rather than inventing one.
 */
export function PdaLastResult() {
  const [receipt, setReceipt] = useState<PdaReceipt | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setReceipt(readReceipt())
    setLoaded(true)
  }, [])

  if (!loaded) {
    return <p className="p-3 text-body-sm text-graphite-400">Loading…</p>
  }

  if (!receipt) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-graphite-800 bg-graphite-900 p-6 text-center">
        <h1 className="text-h2 text-graphite-0">No recent transaction</h1>
        <p className="text-body-sm text-graphite-400">
          The last confirmed transaction on this device appears here. Nothing has been recorded in this
          session yet.
        </p>
        <Link
          href="/pda"
          className="flex min-h-16 w-full items-center justify-center rounded-lg border border-graphite-700 text-body uppercase text-graphite-300"
        >
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <PdaResult
      ok
      announce={false}
      title={receipt.title}
      reference={receipt.reference}
      details={[...receipt.details, { label: 'Time', value: formatDateTime(receipt.at) }]}
      actions={
        <Link
          href="/pda"
          className="flex min-h-16 items-center justify-center rounded-lg border border-graphite-700 text-body uppercase text-graphite-300"
        >
          Back to home
        </Link>
      }
    />
  )
}
