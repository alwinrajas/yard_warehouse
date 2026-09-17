import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api/errors'

import { PdaError, PdaResult } from './pda-ui'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

/**
 * The PDA result surface.
 *
 * A success screen is the operator's only proof a transaction landed, so it may
 * never appear without the server's transaction reference (BRD §21, UX-09).
 */
describe('PdaResult', () => {
  it('announces the outcome assertively', () => {
    render(<PdaResult ok title="Stored" reference="TXN-0001" actions={null} />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByText('TXN-0001')).toBeInTheDocument()
  })

  it('renders the details the operator needs to verify the right pallet moved', () => {
    render(
      <PdaResult
        ok
        title="Moved"
        reference="TXN-0002"
        details={[
          { label: 'Pallet', value: 'PAL-0007' },
          { label: 'To', value: 'YD-A-01-002' },
        ]}
        actions={null}
      />,
    )

    expect(screen.getByText('PAL-0007')).toBeInTheDocument()
    expect(screen.getByText('YD-A-01-002')).toBeInTheDocument()
  })
})

describe('PdaError', () => {
  it('replaces a server code with what the operator should understand', () => {
    const error = new ApiError({
      code: 'PALLET_ALREADY_STORED',
      message: 'That pallet is already stored.',
      status: 409,
      details: { location_code: 'YD-A-01-001' },
    })

    render(<PdaError error={error} onRetry={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Already stored' })).toBeInTheDocument()
    // The operator has to walk somewhere — the location is the actionable part.
    expect(screen.getByText('YD-A-01-001')).toBeInTheDocument()
  })

  it('shows expected against scanned when a location does not match', () => {
    const error = new ApiError({
      code: 'PALLET_NOT_AT_LOCATION',
      message: 'That pallet is not at the scanned location.',
      status: 409,
      details: { expected: 'YD-A-01-001', scanned: 'YD-A-02-005' },
    })

    render(<PdaError error={error} onRetry={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Wrong location' })).toBeInTheDocument()
    expect(screen.getByText('YD-A-01-001')).toBeInTheDocument()
    expect(screen.getByText('YD-A-02-005')).toBeInTheDocument()
  })

  it('falls back to the server message rather than inventing one', () => {
    const error = new ApiError({
      code: 'SOMETHING_NEW',
      message: 'A rule this build does not know about.',
      status: 422,
    })

    render(<PdaError error={error} onRetry={() => {}} />)

    expect(
      screen.getByRole('heading', { name: 'A rule this build does not know about.' }),
    ).toBeInTheDocument()
  })
})
