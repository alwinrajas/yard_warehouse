import { render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PdaResult } from '@/app/pda/pda-ui'

import { resetFeedbackForTests } from './feedback'
import { formatElapsed } from './use-shift-elapsed'
import { __testables } from './use-connectivity'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

/**
 * The field behaviours from docs/08 §2 that only show up in time and hardware:
 * a success that clears itself, a failure that does not, and a clock that stays
 * right after the tab has been asleep.
 */

function stubDevice() {
  const vibrate = vi.fn(() => true)
  vi.stubGlobal('navigator', { ...navigator, vibrate })
  vi.stubGlobal('AudioContext', undefined)
  return vibrate
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  resetFeedbackForTests()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('success auto-dismiss', () => {
  it('continues on its own after three seconds', () => {
    stubDevice()
    const onDismiss = vi.fn()

    render(<PdaResult ok title="Stored" reference="PA-1" actions={null} onDismiss={onDismiss} />)

    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('leaves a failure on screen — it must be dismissed deliberately', () => {
    stubDevice()
    const onDismiss = vi.fn()

    render(
      <PdaResult ok={false} title="Already stored" actions={null} onDismiss={onDismiss} />,
    )

    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(onDismiss).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Already stored' })).toBeInTheDocument()
  })

  it('cancels the timer when the result unmounts', () => {
    stubDevice()
    const onDismiss = vi.fn()

    const { unmount } = render(
      <PdaResult ok title="Stored" reference="PA-1" actions={null} onDismiss={onDismiss} />,
    )

    unmount()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('does not restart the timer when the caller re-renders with a new closure', () => {
    stubDevice()
    const onDismiss = vi.fn()

    const { rerender } = render(
      <PdaResult ok title="Stored" reference="PA-1" actions={null} onDismiss={() => onDismiss()} />,
    )

    // Callers pass an inline arrow, so every render brings a fresh identity. If
    // the timer keyed on it, three seconds would never elapse.
    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(600)
      })
      rerender(
        <PdaResult ok title="Stored" reference="PA-1" actions={null} onDismiss={() => onDismiss()} />,
      )
    }

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('stays put when no continuation was offered', () => {
    stubDevice()

    render(<PdaResult ok title="Stored" reference="PA-1" actions={null} />)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByRole('heading', { name: 'Stored' })).toBeInTheDocument()
  })
})

describe('announcement', () => {
  it('announces a settled result once, not once per render', () => {
    const vibrate = stubDevice()

    const { rerender } = render(
      <PdaResult ok title="Stored" reference="PA-1" actions={null} />,
    )
    rerender(<PdaResult ok title="Stored" reference="PA-1" actions={null} />)
    rerender(<PdaResult ok title="Stored" reference="PA-1" actions={null} />)

    expect(vibrate).toHaveBeenCalledTimes(1)
  })

  it('announces again for a genuinely different transaction', () => {
    const vibrate = stubDevice()

    const { rerender } = render(
      <PdaResult ok title="Stored" reference="PA-1" actions={null} />,
    )
    rerender(<PdaResult ok title="Stored" reference="PA-2" actions={null} />)

    expect(vibrate).toHaveBeenCalledTimes(2)
  })

  it('stays silent for a result being re-read rather than one that just happened', () => {
    const vibrate = stubDevice()

    render(<PdaResult ok announce={false} title="Stored" reference="PA-1" actions={null} />)

    expect(vibrate).not.toHaveBeenCalled()
  })
})

describe('shift elapsed', () => {
  it('formats as HH:MM:SS and does not wrap at a day', () => {
    expect(formatElapsed(0)).toBe('00:00:00')
    expect(formatElapsed(9_434_000)).toBe('02:37:14')
    expect(formatElapsed(26 * 3600 * 1000)).toBe('26:00:00')
  })
})

describe('weak connectivity', () => {
  it('reads weak from the signals the browser already measures', () => {
    expect(__testables.isWeak({ effectiveType: 'slow-2g' })).toBe(true)
    expect(__testables.isWeak({ effectiveType: '2g' })).toBe(true)
    expect(__testables.isWeak({ rtt: 900 })).toBe(true)
    expect(__testables.isWeak({ downlink: 0.2 })).toBe(true)
  })

  it('does not call a healthy connection weak', () => {
    expect(__testables.isWeak({ effectiveType: '4g', rtt: 50, downlink: 10 })).toBe(false)
    expect(__testables.isWeak({ effectiveType: '3g', rtt: 200, downlink: 2 })).toBe(false)
  })

  it('never invents weak where the browser cannot measure it', () => {
    // No Network Information API — online/offline only, rather than a guess.
    expect(__testables.isWeak(undefined)).toBe(false)
    expect(__testables.isWeak({})).toBe(false)
  })
})
