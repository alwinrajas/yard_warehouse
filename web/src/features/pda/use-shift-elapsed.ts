'use client'

import { useEffect, useState } from 'react'

/**
 * Time on shift, for the PDA header (docs/08 §2).
 *
 * Measured from when this PDA session was signed in, which the BFF records in
 * the session cookie at the moment it issues one. That is a real observed fact,
 * not an inferred one — and for the PDA it is the shift start, because CFG-20
 * permits a single active PDA session per user, so signing in *is* starting
 * work.
 *
 * It is deliberately not derived from the token's `expires_at` minus the token
 * lifetime: that would copy a backend constant into the frontend, and the two
 * would drift silently the first time the lifetime changed.
 *
 * KNOWN LIMIT: if the customer's shift begins before the operator signs in — a
 * briefing, a handover — this reads short. Closing that needs a real shift
 * record on the backend, which does not exist and has not been invented here.
 *
 * Elapsed is recomputed from the two timestamps on every tick rather than
 * accumulated, so backgrounding the tab (which throttles or suspends timers)
 * cannot make it drift.
 */
export function useShiftElapsed(signedInAt: string | null | undefined): string | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!signedInAt) return

    const tick = () => setNow(Date.now())

    const interval = window.setInterval(tick, 1000)

    // Coming back to the tab re-reads the clock immediately, so the operator
    // never sees a stale figure while the next tick is pending.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [signedInAt])

  if (!signedInAt) return null

  const started = Date.parse(signedInAt)
  if (Number.isNaN(started)) return null

  return formatElapsed(Math.max(0, now - started))
}

/** HH:MM:SS, per the docs/08 §2 example. Hours are not capped at 24. */
export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
