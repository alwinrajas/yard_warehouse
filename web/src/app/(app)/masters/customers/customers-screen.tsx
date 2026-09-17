'use client'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, EmptyState, Panel } from '@/components/ui'

/**
 * W-25 Customer Reference (docs/23 §10).
 *
 * Optional master per BRD §7. It is only populated once the ERP barcode
 * structure is confirmed (OI-01) or customer data is imported (OI-11), so the
 * screen states the dependency rather than presenting an empty CRUD table as
 * though it were ready.
 */
export function CustomersScreen() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Customers"
        context="Optional reference data for customer and LPO reporting"
        breadcrumbs={[{ label: 'Masters' }, { label: 'Customers' }]}
      />

      <Alert tone="info" title="This master depends on an unanswered customer input">
        Customer and LPO values reach ALU TRACK either encoded in the ERP pallet label (open item
        OI-01, awaiting sample labels) or by import (OI-11). Until one of those is confirmed,
        customer records are created automatically from whatever the label carries.
      </Alert>

      <Panel padded={false} className="shadow-card">
        <EmptyState
          headingLevel={2}
          variant="not-started"
          title="No customers recorded yet"
          description="Customers appear here once pallet labels carry customer data, or once a customer list is imported."
        />
      </Panel>
    </div>
  )
}
