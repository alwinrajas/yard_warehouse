import { render } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api/errors'

import { PdaButton, PdaError, PdaResult, PdaScan, PdaStep, PdaValue } from './pda-ui'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

/**
 * The PDA is used one-handed, gloved, in a moving forklift.
 *
 * Contrast is verified numerically against the tokens (design-tokens/check-contrast.mjs),
 * because jsdom has no computed paint; everything else axe can judge is judged here.
 */
async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  })
  expect(results.violations.map((v) => `${v.id}: ${v.description}`)).toEqual([])
}

describe('PDA accessibility', () => {
  it('the scan step has no violations', async () => {
    const { container } = render(
      <main>
        <PdaStep step={1} total={3} label="Scan location" />
        <PdaScan prompt="Scan the location barcode" onScan={() => {}} autoFocus={false} />
        <PdaValue label="Pallet" value="PAL-10245" sub="JOB-8817" />
        <PdaButton onClick={() => {}}>Confirm put-away</PdaButton>
      </main>,
    )

    await expectNoViolations(container)
  })

  it('the result and failure screens have no violations', async () => {
    const { container } = render(
      <main>
        <PdaResult
          ok
          title="Stored"
          reference="TXN-0001"
          details={[{ label: 'Pallet', value: 'PAL-10245' }]}
          actions={<PdaButton onClick={() => {}}>Next pallet</PdaButton>}
        />
        <PdaError
          error={
            new ApiError({
              code: 'LOCATION_BLOCKED',
              message: 'That location is blocked.',
              status: 409,
              details: { location_code: 'YD-A-01-001', reason: 'Surface repair' },
            })
          }
          onRetry={() => {}}
        />
      </main>,
    )

    await expectNoViolations(container)
  })

  it('every interactive target carries an accessible name', () => {
    const { getByRole, getByLabelText } = render(
      <main>
        <PdaScan prompt="Scan the pallet label" onScan={() => {}} autoFocus={false} />
      </main>,
    )

    // The scan input is the primary target and must be reachable by name for
    // both screen readers and the hardware scanner's focus handling.
    expect(getByLabelText('Scan the pallet label')).toBeInTheDocument()
    expect(getByRole('button', { name: 'Enter manually' })).toBeInTheDocument()
  })
})
