import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './button'

describe('Button', () => {
  it('defaults to type="button" so it cannot accidentally submit a form', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('is disabled and announced as busy while loading', () => {
    render(<Button loading>Confirm</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('swaps the label while loading without losing the control', async () => {
    render(
      <Button loading loadingLabel="Committing transaction…">
        Confirm put-away
      </Button>,
    )
    expect(screen.getByText('Committing transaction…')).toBeInTheDocument()
  })

  it('renders as a link when asChild, with icons intact', () => {
    // Regression: Slot throws "Expected a single React element child" unless the
    // real child is wrapped in Slottable. This broke every asChild call site.
    render(
      <Button asChild leftIcon={<span data-testid="icon" />}>
        <a href="/profile">Go to your profile</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: /go to your profile/i })
    expect(link).toHaveAttribute('href', '/profile')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('does not fire while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Confirm
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
