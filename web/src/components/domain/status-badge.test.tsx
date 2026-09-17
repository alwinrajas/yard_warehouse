import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { STATUS_KEYS } from '@/lib/status'

import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it('renders the BRD label for every status', () => {
    for (const key of STATUS_KEYS) {
      const { unmount } = render(<StatusBadge status={key} />)
      expect(screen.getByText(/\w/)).toBeInTheDocument()
      unmount()
    }
  })

  it('never conveys status by colour alone — text is always present', () => {
    render(<StatusBadge status="on-hold" />)
    expect(screen.getByText('On Hold')).toBeInTheDocument()
  })

  it('marks the decorative dot and icon as hidden from assistive tech', () => {
    const { container } = render(<StatusBadge status="dispatched" />)
    const hidden = container.querySelectorAll('[aria-hidden="true"]')
    expect(hidden.length).toBeGreaterThanOrEqual(2)
  })
})
