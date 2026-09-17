'use client'

import { useEffect, useState } from 'react'

import { Field, Panel, PanelHeader, RadioGroup, Select } from '@/components/ui'
import { PAGE_SIZE_OPTIONS } from '@/lib/app-config'
import type { TableDensity } from '@/components/ui'

/**
 * Per-viewer display preferences.
 *
 * Stored in localStorage only. docs/26 §3 pairs these with a server-side profile;
 * there is no endpoint for it in the API contract (docs/03 §3), so they are
 * device-local until one exists. Every read and write is guarded, because
 * storage throws in private windows and with site data blocked.
 */
const KEYS = {
  density: 'alutrack.table.density',
  pageSize: 'alutrack.table.pageSize',
} as const

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — the preference simply does not persist */
  }
}

export function PreferencesPanel() {
  const [density, setDensity] = useState<TableDensity>('default')
  const [pageSize, setPageSize] = useState<string>('50')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const storedDensity = readStored(KEYS.density)
    const storedPageSize = readStored(KEYS.pageSize)
    if (storedDensity === 'compact' || storedDensity === 'default' || storedDensity === 'comfortable') {
      setDensity(storedDensity)
    }
    if (storedPageSize) setPageSize(storedPageSize)
    setLoaded(true)
  }, [])

  return (
    <Panel>
      <PanelHeader
        title="Display preferences"
        description="Saved on this device only"
      />
      <div id="preferences" className="flex max-w-md flex-col gap-5">
        <Field label="Table row density">
          <RadioGroup
            ariaLabel="Table row density"
            value={density}
            onValueChange={(value) => {
              const next = value as TableDensity
              setDensity(next)
              writeStored(KEYS.density, next)
            }}
            options={[
              { value: 'compact', label: 'Compact', description: 'Most rows per screen' },
              { value: 'default', label: 'Default' },
              { value: 'comfortable', label: 'Comfortable', description: 'Easier on a touch screen' },
            ]}
          />
        </Field>

        <Field label="Rows per page">
          <Select
            ariaLabel="Rows per page"
            value={loaded ? pageSize : undefined}
            onValueChange={(value) => {
              setPageSize(value)
              writeStored(KEYS.pageSize, value)
            }}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
          />
        </Field>
      </div>
    </Panel>
  )
}
