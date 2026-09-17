import { render } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import { AgeingIndicator } from './domain/ageing-indicator'
import { ExceptionPanel } from './domain/exception-panel'
import { LocationRef } from './domain/location-ref'
import { MovementDirection } from './domain/movement-direction'
import { PalletIdentity } from './domain/pallet-identity'
import { StatusBadge } from './domain/status-badge'
import { TransactionResult } from './domain/transaction-result'
import { Alert } from './ui/alert'
import { Button } from './ui/button'
import { DataTable } from './ui/data-table'
import type { DataTableColumn } from './ui/data-table-types'
import { EmptyState } from './ui/empty-state'
import { Field } from './ui/field'
import { Input } from './ui/input'
import { KpiCard } from './ui/kpi-card'
import { Pagination } from './ui/pagination'
import { ProgressSteps } from './ui/progress-steps'
import { StatPanel } from './ui/stat-panel'

/**
 * docs/26 §9 `axe` — accessibility is a build check, not a review opinion.
 *
 * Runs axe-core over representative compositions of the design system. Screens
 * add their own axe assertions as they are built (docs/27 §5).
 */
async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    // Colour contrast cannot be evaluated in jsdom, which has no layout or
    // computed paint. It is verified against the built page instead.
    rules: { 'color-contrast': { enabled: false } },
  })
  const messages = results.violations.map(
    (violation) => `${violation.id}: ${violation.description}`,
  )
  expect(messages).toEqual([])
}

const location = {
  id: 'l1',
  code: 'YD-A-03-018',
  facilityName: 'Open Yard A',
  zoneName: 'Zone A',
  state: 'occupied' as const,
}

const pallet = {
  id: 'p1',
  palletNumber: 'PAL-10245',
  jobNumber: 'JOB-8817',
  customerName: 'Gulf Aluminium',
  status: 'stored' as const,
}

describe('accessibility', () => {
  it('domain components have no violations', async () => {
    const { container } = render(
      <main>
        <h1>Inventory</h1>
        <PalletIdentity pallet={pallet} variant="hero" />
        <LocationRef location={location} variant="hero" />
        <MovementDirection from={location} to={{ ...location, id: 'l2', code: 'WH-B-02-011' }} />
        <StatusBadge status="on-hold" />
        <AgeingIndicator days={22} />
        <StatPanel stats={[{ label: 'Put away', value: '12 Sep 2026' }]} />
      </main>,
    )
    await expectNoViolations(container)
  })

  it('form controls are labelled and errors are associated', async () => {
    const { container } = render(
      <main>
        <h1>Put-away</h1>
        <form>
          <Field label="Location code" description="Scan or type the barcode" required>
            <Input mono placeholder="YD-A-03-018" />
          </Field>
          <Field label="Pallet number" error="No pallet found with that barcode.">
            <Input mono invalid />
          </Field>
          <Button variant="primary">Confirm</Button>
        </form>
      </main>,
    )
    await expectNoViolations(container)
  })

  it('the table exposes correct semantics', async () => {
    const columns: DataTableColumn<{ id: string; code: string }>[] = [
      { id: 'code', header: 'Location', priority: 1, sortable: true, sortKey: 'code', accessor: (row) => row.code },
    ]
    const { container } = render(
      <main>
        <h1>Locations</h1>
        <DataTable
          dataset="locations"
          columns={columns}
          rows={[{ id: '1', code: 'YD-A-03-018' }]}
          getRowId={(row) => row.id}
          sort={{ key: 'code', direction: 'asc' }}
          onSortChange={() => undefined}
          caption="Locations"
        />
        <Pagination page={1} pageSize={25} total={100} onPageChange={() => undefined} />
      </main>,
    )
    await expectNoViolations(container)
  })

  it('feedback and state surfaces have no violations', async () => {
    const { container } = render(
      <main>
        <h1>States</h1>
        <Alert tone="warning" title="2 locations are blocked" />
        <ExceptionPanel
          headingLevel={2}
          title="Pallet already stored"
          description="This pallet is recorded at another location."
          comparison={{ expected: 'YD-A-03-018', actual: 'YD-B-02-004' }}
          actions={<Button size="sm">View pallet</Button>}
        />
        <TransactionResult
          headingLevel={2}
          title="Pallet stored"
          reference="PA-20260916-000148"
          details={[{ label: 'Location', value: 'YD-A-03-018', mono: true }]}
        />
        <EmptyState
          headingLevel={2}
          variant="forbidden"
          title="You do not have access"
          permission="correction.perform"
        />
        <KpiCard label="Total active pallets" value={3847} onClick={() => undefined} />
        <ProgressSteps
          current={1}
          steps={[
            { id: '1', label: 'Location' },
            { id: '2', label: 'Pallet' },
          ]}
        />
      </main>,
    )
    await expectNoViolations(container)
  })
})
