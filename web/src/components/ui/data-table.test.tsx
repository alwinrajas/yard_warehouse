import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DataTable } from './data-table'
import type { DataTableColumn } from './data-table-types'

type Row = { id: string; code: string }

const columns: DataTableColumn<Row>[] = [
  { id: 'code', header: 'Location', priority: 1, accessor: (row) => row.code },
]

describe('DataTable', () => {
  it('renders a real table with column headers', () => {
    render(
      <DataTable
        dataset="locations"
        columns={columns}
        rows={[{ id: '1', code: 'YD-A-03-018' }]}
        getRowId={(row) => row.id}
      />,
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /location/i })).toBeInTheDocument()
    expect(screen.getByText('YD-A-03-018')).toBeInTheDocument()
  })

  it('shows a skeleton while loading rather than a blank region', () => {
    render(
      <DataTable
        dataset="locations"
        columns={columns}
        rows={[]}
        getRowId={(row) => row.id}
        loading
      />,
    )
    expect(screen.getByRole('status', { name: /loading table/i })).toBeInTheDocument()
  })

  it('distinguishes an error state and offers a retry', () => {
    const onRetry = vi.fn()
    render(
      <DataTable
        dataset="locations"
        columns={columns}
        rows={[]}
        getRowId={(row) => row.id}
        error={{ code: 'UPSTREAM_TIMEOUT', message: 'The server did not respond.' }}
        onRetry={onRetry}
      />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('UPSTREAM_TIMEOUT')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('exposes sort state to assistive tech', () => {
    render(
      <DataTable
        dataset="locations"
        columns={[{ ...columns[0]!, sortable: true, sortKey: 'code' }]}
        rows={[{ id: '1', code: 'YD-A-03-018' }]}
        getRowId={(row) => row.id}
        sort={{ key: 'code', direction: 'asc' }}
        onSortChange={() => undefined}
      />,
    )
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending')
  })

  it('throws in development when a column is sortable without a covering index', () => {
    expect(() =>
      render(
        <DataTable
          dataset="locations"
          columns={[{ ...columns[0]!, sortable: true, sortKey: 'description' }]}
          rows={[]}
          getRowId={(row) => row.id}
        />,
      ),
    ).toThrow(/no covering index/)
  })
})
