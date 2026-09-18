'use client'

import { useEffect, useState } from 'react'

export type Connectivity = 'online' | 'weak' | 'offline'

/**
 * The connectivity chip's source of truth (docs/08 §2).
 *
 * `offline` is authoritative — `navigator.onLine` false means no request will
 * succeed. `weak` is advisory: it warns the operator that a confirm may take a
 * while, so they wait for it rather than assuming the scan was lost.
 *
 * Weak is read from the Network Information API, which is the one signal the
 * browser already measures. Where it is unsupported — and it is unsupported on
 * iOS and on desktop Firefox — the hook reports only online/offline rather than
 * guessing. A fabricated "weak" would teach operators to ignore the chip.
 *
 * Two readings are required before the state flips. A single sample flickers as
 * the radio hands between cells, and a chip that blinks is a chip nobody reads.
 */

type NetworkInformation = {
  effectiveType?: string
  rtt?: number
  downlink?: number
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

function connection(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as unknown as { connection?: NetworkInformation }).connection
}

/**
 * Thresholds follow the Network Information API's own definitions: 2G-class
 * effective throughput, or a round trip long enough that a confirm feels hung.
 */
function isWeak(info: NetworkInformation | undefined): boolean {
  if (!info) return false

  if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') return true
  if (typeof info.rtt === 'number' && info.rtt >= 600) return true
  if (typeof info.downlink === 'number' && info.downlink > 0 && info.downlink < 0.4) return true

  return false
}

export function useConnectivity(): Connectivity {
  const [state, setState] = useState<Connectivity>('online')

  useEffect(() => {
    // Hysteresis: a candidate must be seen twice in a row to take effect.
    let pending: Connectivity | null = null

    const read = (): Connectivity => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
      return isWeak(connection()) ? 'weak' : 'online'
    }

    const apply = (next: Connectivity, immediate: boolean) => {
      // Losing the network is never debounced — the operator must know at once.
      if (immediate || next === 'offline') {
        pending = null
        setState(next)
        return
      }

      setState((current) => {
        if (next === current) {
          pending = null
          return current
        }
        if (pending === next) {
          pending = null
          return next
        }
        pending = next
        return current
      })
    }

    apply(read(), true)

    const onNetworkEvent = () => apply(read(), false)
    const onOffline = () => apply('offline', true)
    const onOnline = () => apply(read(), true)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const info = connection()
    info?.addEventListener?.('change', onNetworkEvent)

    // The change event does not fire for gradual degradation, so sample as well.
    const interval = window.setInterval(onNetworkEvent, 10_000)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      info?.removeEventListener?.('change', onNetworkEvent)
      window.clearInterval(interval)
    }
  }, [])

  return state
}

/** Exported for the tests, which drive the thresholds directly. */
export const __testables = { isWeak }
