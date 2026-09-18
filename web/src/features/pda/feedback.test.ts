import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  announce,
  feedbackCapabilities,
  pdaFeedback,
  resetFeedbackForTests,
} from './feedback'

/**
 * docs/08 §2 — feedback is triple-channel, and every channel is optional.
 *
 * The rule these tests defend is that a missing or broken capability is never
 * allowed to become a transaction failure. The operator's device decides how
 * much of the announcement it can render; it never decides whether the pallet
 * moved.
 */

function stubVibrate() {
  const vibrate = vi.fn((_pattern: number | number[]) => true)
  vi.stubGlobal('navigator', { ...navigator, vibrate })
  return vibrate
}

/** A minimal WebAudio double — enough to prove the graph is built and started. */
function stubAudio() {
  const start = vi.fn()
  const stop = vi.fn()
  const connect = vi.fn(function (this: unknown, target: unknown) {
    return target
  })
  const resume = vi.fn()

  const ctx = {
    state: 'suspended' as AudioContextState,
    currentTime: 0,
    destination: {},
    resume,
    close: vi.fn(),
    createOscillator: vi.fn(() => ({
      type: '' as OscillatorType,
      frequency: { value: 0 },
      connect,
      start,
      stop,
    })),
    createGain: vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect,
    })),
  }

  const Ctor = vi.fn(() => ctx)
  vi.stubGlobal('AudioContext', Ctor)

  return { ctx, start, stop, resume, Ctor }
}

afterEach(() => {
  resetFeedbackForTests()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('vibration', () => {
  it('buzzes once for 200 ms on success', () => {
    const vibrate = stubVibrate()

    pdaFeedback.success()

    expect(vibrate).toHaveBeenCalledWith(200)
  })

  it('double-buzzes on error so failure is unmistakable', () => {
    const vibrate = stubVibrate()

    pdaFeedback.error()

    // A distinct shape, not merely a longer one — the operator is not looking.
    expect(vibrate).toHaveBeenCalledWith([500, 200, 500])
    expect(vibrate.mock.calls[0]?.[0]).not.toEqual(200)
  })

  it('is skipped silently when the device has no vibrator', () => {
    vi.stubGlobal('navigator', {})

    expect(() => pdaFeedback.success()).not.toThrow()
  })

  it('does not propagate a vibrate that throws', () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('refused')
      },
    })

    expect(() => pdaFeedback.error()).not.toThrow()
  })
})

describe('audio', () => {
  it('plays two rising tones on success', () => {
    const { ctx, start } = stubAudio()

    pdaFeedback.success()

    expect(ctx.createOscillator).toHaveBeenCalledTimes(2)
    expect(start).toHaveBeenCalledTimes(2)

    const [first, second] = ctx.createOscillator.mock.results.map((r) => r.value)
    expect(second!.frequency.value).toBeGreaterThan(first!.frequency.value)
  })

  it('plays a single low tone on error', () => {
    const { ctx } = stubAudio()

    pdaFeedback.error()

    expect(ctx.createOscillator).toHaveBeenCalledTimes(1)
    const tone = ctx.createOscillator.mock.results[0]!.value
    expect(tone.frequency.value).toBeLessThan(400)
  })

  it('resumes a context parked by autoplay policy', () => {
    const { resume } = stubAudio()

    pdaFeedback.success()

    expect(resume).toHaveBeenCalled()
  })

  it('constructs no AudioContext until a result is announced', () => {
    const { Ctor } = stubAudio()

    // Importing and rendering must not make a sound; only a settled transaction does.
    expect(Ctor).not.toHaveBeenCalled()

    pdaFeedback.success()
    expect(Ctor).toHaveBeenCalledTimes(1)
  })

  it('reuses one context across announcements', () => {
    const { Ctor } = stubAudio()

    pdaFeedback.success()
    pdaFeedback.error()

    expect(Ctor).toHaveBeenCalledTimes(1)
  })

  it('survives a browser with no AudioContext at all', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)

    expect(() => announce('success')).not.toThrow()
  })

  it('survives a constructor that throws', () => {
    vi.stubGlobal('AudioContext', function () {
      throw new Error('blocked')
    })

    expect(() => announce('error')).not.toThrow()
  })
})

describe('capability reporting', () => {
  it('reports what the device can actually do', () => {
    stubVibrate()
    stubAudio()

    expect(feedbackCapabilities()).toEqual({ vibration: true, audio: true })
  })

  it('reports honestly when nothing is supported', () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('AudioContext', undefined)

    expect(feedbackCapabilities()).toEqual({ vibration: false, audio: false })
  })

  it('still announces when both channels are missing — visual carries it', () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('AudioContext', undefined)

    expect(() => pdaFeedback.success()).not.toThrow()
    expect(() => pdaFeedback.error()).not.toThrow()
  })
})
