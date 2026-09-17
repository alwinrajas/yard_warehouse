'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { ExceptionPanel } from '@/components/domain/exception-panel'
import { Button } from '@/components/ui'
import type { ApiError } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/format'

/**
 * Turns an API rejection into what happened / why / what next (UX-07).
 *
 * The server already returns the current truth in the error details; this maps
 * it to copy and real actions. No screen ever shows "something went wrong".
 */
export function OperationError({
  error,
  onRetry,
  extraActions,
}: {
  error: ApiError
  onRetry?: () => void
  extraActions?: ReactNode
}) {
  const router = useRouter()
  const d = (error.details ?? {}) as Record<string, string | undefined>

  const common = (actions: ReactNode, props: Parameters<typeof ExceptionPanel>[0]) => (
    <ExceptionPanel {...props} headingLevel={2} errorCode={error.code} traceId={error.traceId} actions={actions} />
  )

  const tryAgain = onRetry ? (
    <Button variant="secondary" size="sm" onClick={onRetry}>
      Start again
    </Button>
  ) : null

  switch (error.code) {
    case 'PALLET_ALREADY_STORED':
      return common(
        <>
          <Button variant="primary" size="sm" onClick={() => router.push('/inventory')}>
            View in inventory
          </Button>
          {extraActions}
          {tryAgain}
        </>,
        {
          title: 'Pallet already stored',
          description: 'This pallet is already recorded at another location.',
          details: [
            { label: 'Location', value: d['location_code'] ?? '—', mono: true },
            { label: 'Facility', value: d['facility'] ?? '—' },
            { label: 'Stored at', value: formatDateTime(d['stored_at']) },
          ],
        },
      )

    case 'PALLET_NOT_AT_LOCATION':
    case 'SOURCE_LOCATION_MISMATCH':
      return common(tryAgain, {
        title: 'Wrong location',
        description: 'This pallet is not at the location you scanned.',
        comparison: { expected: d['expected'] ?? '—', actual: d['scanned'] ?? '—' },
      })

    case 'LOCATION_BLOCKED':
      return common(tryAgain, {
        tone: 'blocked',
        title: 'Location is blocked',
        description: 'New put-away and transfers into this location are refused.',
        details: [
          { label: 'Location', value: d['location_code'] ?? '—', mono: true },
          { label: 'Reason', value: d['reason'] ?? 'Not recorded' },
          { label: 'Remarks', value: d['remarks'] ?? '—' },
        ],
      })

    case 'LOCATION_INACTIVE':
      return common(tryAgain, {
        tone: 'blocked',
        title: 'Location is not in use',
        description: 'This location has been deactivated in the location master.',
        details: [{ label: 'Location', value: d['location_code'] ?? '—', mono: true }],
      })

    case 'PALLET_ON_HOLD':
      return common(
        <>
          <Button variant="secondary" size="sm" onClick={() => router.push('/holds-exceptions')}>
            View holds
          </Button>
          {tryAgain}
        </>,
        {
          tone: 'blocked',
          title: 'Pallet is on hold',
          description: 'A held pallet cannot be dispatched until the hold is released.',
          details: [
            { label: 'State', value: d['block_state'] ?? '—' },
            { label: 'Reason', value: d['reason'] ?? 'Not recorded' },
            { label: 'Placed at', value: formatDateTime(d['placed_at']) },
          ],
        },
      )

    case 'PALLET_ALREADY_DISPATCHED':
      return common(tryAgain, {
        title: 'Pallet already dispatched',
        description: 'This pallet has left the yard. Reversing a dispatch requires an authorised correction.',
        details: [{ label: 'Dispatched at', value: formatDateTime(d['dispatched_at']) }],
      })

    case 'PALLET_NOT_IN_INVENTORY':
      return common(tryAgain, {
        title: 'Pallet is not in inventory',
        description: 'This pallet is not currently stored anywhere.',
        details: [{ label: 'Status', value: d['status'] ?? '—' }],
      })

    case 'LOCATION_NOT_FOUND':
      return common(tryAgain, {
        title: 'Location not recognised',
        description: 'That barcode does not match any location. Check the label, or select the location manually.',
      })

    case 'PALLET_NOT_FOUND':
      return common(tryAgain, {
        title: 'Pallet not recognised',
        description: 'No pallet is recorded with that barcode. It may not have been put away yet.',
      })

    case 'LOCATION_CAPACITY_EXCEEDED':
      return common(tryAgain, {
        tone: 'warning',
        title: 'Location is full',
        description: 'This location is already at its defined capacity.',
        details: [
          { label: 'Occupancy', value: d['occupancy'] ?? '—' },
          { label: 'Capacity', value: d['capacity'] ?? '—' },
        ],
      })

    case 'SAME_LOCATION':
      return common(tryAgain, {
        tone: 'warning',
        title: 'Destination is the current location',
        description: 'Choose a different destination, or cancel the move.',
      })

    case 'PERMISSION_DENIED':
      return common(null, {
        tone: 'blocked',
        title: 'Not permitted',
        description: 'Your role does not allow this action.',
        details: [{ label: 'Required permission', value: d['required_permission'] ?? '—', mono: true }],
      })

    case 'UPSTREAM_UNAVAILABLE':
      return common(tryAgain, {
        title: 'Cannot reach the ALU TRACK server',
        description: 'Nothing was recorded. Check your connection and try again.',
      })

    default:
      return common(tryAgain, {
        title: error.message,
        description: 'Nothing was recorded.',
      })
  }
}
