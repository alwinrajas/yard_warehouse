'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { request } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import type { PalletDetail } from '@/lib/api/inventory-types'
import type { LocationRecord } from '@/lib/api/types'

/**
 * Advisory pre-checks so a bad scan is caught before the pallet is lifted.
 *
 * These never decide anything: the committing endpoint re-validates everything
 * under the pallet lock (CC-08). They exist purely so the operator learns about
 * a blocked lane early.
 */
export function useLocationScan() {
  const [location, setLocation] = useState<LocationRecord | null>(null)

  const mutation = useMutation<LocationRecord, ApiError, string>({
    mutationFn: (barcode) =>
      request<LocationRecord>('/api/proxy/operations/validate-location', {
        method: 'POST',
        body: { barcode },
      }),
    onSuccess: setLocation,
  })

  return {
    location,
    scan: mutation.mutate,
    reset: () => {
      setLocation(null)
      mutation.reset()
    },
    isScanning: mutation.isPending,
    error: mutation.error,
  }
}

export function usePalletScan(createIfMissing = false) {
  const [pallet, setPallet] = useState<PalletDetail | null>(null)

  const mutation = useMutation<PalletDetail, ApiError, string>({
    mutationFn: (barcode) =>
      request<PalletDetail>('/api/proxy/operations/resolve-pallet', {
        method: 'POST',
        body: { barcode, create: createIfMissing },
      }),
    onSuccess: setPallet,
  })

  return {
    pallet,
    scan: mutation.mutate,
    reset: () => {
      setPallet(null)
      mutation.reset()
    },
    isScanning: mutation.isPending,
    error: mutation.error,
  }
}
