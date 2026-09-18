/**
 * PDA transaction feedback — the non-visual two thirds of docs/08 §2.
 *
 * The operator is gloved, in a forklift, in a noisy yard, often in direct
 * sunlight, and is usually already driving by the time the result lands. Colour
 * alone does not reach them, so every result is announced on three channels:
 * colour (the result screen), sound, and vibration.
 *
 * Three rules hold this together:
 *
 *  - It is announcement only. Nothing here decides anything; it is called
 *    *after* the server has confirmed or rejected, never before (docs/08 §2 —
 *    the pending state is explicitly not a success state).
 *  - Every channel is optional. A device with no vibrator, a browser that
 *    refuses audio, a muted handset — each degrades to the channels that do
 *    work. A capability failure must never surface as a transaction failure.
 *  - It is never called on page load. The AudioContext is constructed on first
 *    use, which is always inside the gesture that confirmed the transaction, so
 *    autoplay policy is satisfied without asking for permission up front.
 */

export type FeedbackKind = 'success' | 'error' | 'warning'

/** docs/08 §2. Error is a double buzz so failure is unmistakable while looking away. */
const VIBRATION: Record<FeedbackKind, number | number[]> = {
  success: 200,
  error: [500, 200, 500],
  warning: 150,
}

type Tone = { hz: number; ms: number; type: OscillatorType; gain: number }

/**
 * Short, dry tones that carry over machinery without being shrill.
 *
 * Success rises (880 → 1320 Hz): a rising interval reads as "done" across
 * cultures and cuts through low-frequency yard noise. Error is a single low
 * sawtooth buzz — deliberately the opposite shape, so the two can never be
 * confused at the edge of hearing.
 */
const TONES: Record<FeedbackKind, Tone[]> = {
  success: [
    { hz: 880, ms: 90, type: 'square', gain: 0.18 },
    { hz: 1320, ms: 130, type: 'square', gain: 0.18 },
  ],
  error: [{ hz: 160, ms: 420, type: 'sawtooth', gain: 0.22 }],
  warning: [{ hz: 620, ms: 150, type: 'square', gain: 0.18 }],
}

type AudioCtor = typeof AudioContext

let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (context) return context

  // webkitAudioContext is still the only constructor on older Android WebViews.
  const Ctor: AudioCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext

  if (!Ctor) return null

  try {
    context = new Ctor()
    return context
  } catch {
    // Blocked or unavailable — the other two channels still carry the result.
    return null
  }
}

function playTones(tones: Tone[]): void {
  const ctx = audioContext()
  if (!ctx) return

  try {
    // Autoplay policy parks the context until a gesture resumes it. This call
    // happens inside the confirm tap, so the resume is permitted.
    if (ctx.state === 'suspended') void ctx.resume()

    let at = ctx.currentTime
    for (const tone of tones) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = tone.type
      oscillator.frequency.value = tone.hz

      // A hard start and stop on a square wave clicks; a short ramp does not.
      const seconds = tone.ms / 1000
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(tone.gain, at + 0.012)
      gain.gain.setValueAtTime(tone.gain, at + seconds - 0.02)
      gain.gain.linearRampToValueAtTime(0, at + seconds)

      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start(at)
      oscillator.stop(at + seconds)

      at += seconds
    }
  } catch {
    /* Audio is an enhancement; the result screen has already been rendered. */
  }
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return

  try {
    navigator.vibrate(pattern)
  } catch {
    /* Some browsers expose vibrate and then refuse it. Not our problem to solve. */
  }
}

/**
 * Announce a settled transaction result.
 *
 * Call this only once the server has answered. Both channels are independent —
 * one throwing never stops the other.
 */
export function announce(kind: FeedbackKind): void {
  vibrate(VIBRATION[kind])
  playTones(TONES[kind])
}

export const pdaFeedback = {
  success: () => announce('success'),
  error: () => announce('error'),
  warning: () => announce('warning'),
}

/** What the device can actually do — used by tests and by the fallback copy. */
export function feedbackCapabilities(): { vibration: boolean; audio: boolean } {
  const vibration =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

  const audio =
    typeof window !== 'undefined' &&
    Boolean(
      window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext,
    )

  return { vibration, audio }
}

/** Test seam: drops the memoised context so each case starts clean. */
export function resetFeedbackForTests(): void {
  try {
    void context?.close()
  } catch {
    /* ignore */
  }
  context = null
}
