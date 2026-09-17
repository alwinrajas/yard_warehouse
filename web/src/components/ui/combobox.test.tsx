import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Combobox } from './combobox'

const OPTIONS = [
  { value: '1', label: 'DEMO Open Yard A', description: 'YD-A' },
  { value: '2', label: 'DEMO Warehouse B', description: 'WH-B' },
  { value: '3', label: 'Dispatch Bay', description: 'DP-1' },
]

describe('Combobox', () => {
  it('exposes the ARIA contract a combobox requires', () => {
    render(<Combobox ariaLabel="Facility" options={OPTIONS} onValueChange={() => undefined} />)
    const trigger = screen.getByRole('combobox', { name: 'Facility' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls')
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
  })

  it('shows the selected option rather than the placeholder', () => {
    render(
      <Combobox ariaLabel="Facility" options={OPTIONS} value="2" onValueChange={() => undefined} />,
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('DEMO Warehouse B')
  })

  it('filters on label and on description, and selects', async () => {
    const onValueChange = vi.fn()
    render(<Combobox ariaLabel="Facility" options={OPTIONS} onValueChange={onValueChange} />)

    await userEvent.click(screen.getByRole('combobox'))
    const search = screen.getByRole('textbox')

    // Description matching matters: operators know facilities by code, not name.
    await userEvent.type(search, 'WH-B')
    expect(screen.getAllByRole('option')).toHaveLength(1)

    await userEvent.clear(search)
    await userEvent.type(search, 'yard')
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)

    await userEvent.click(options[0]!)
    expect(onValueChange).toHaveBeenCalledWith('1')
  })

  it('reports an empty result rather than an empty box', async () => {
    render(<Combobox ariaLabel="Facility" options={OPTIONS} onValueChange={() => undefined} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.type(screen.getByRole('textbox'), 'zzzz')

    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('No matches.')).toBeInTheDocument()
  })

  it('clears to null only when clearable and something is selected', async () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <Combobox ariaLabel="Facility" options={OPTIONS} value="1" onValueChange={onValueChange} />,
    )
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument()

    rerender(
      <Combobox
        ariaLabel="Facility"
        options={OPTIONS}
        value="1"
        clearable
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByText('Clear selection'))
    expect(onValueChange).toHaveBeenCalledWith(null)
  })

  it('cannot be opened when disabled', async () => {
    render(
      <Combobox ariaLabel="Facility" options={OPTIONS} disabled onValueChange={() => undefined} />,
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
    await userEvent.click(trigger)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
