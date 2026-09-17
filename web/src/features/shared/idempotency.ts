/**
 * One key per user-initiated confirmation, reused across retries.
 *
 * That distinction is what makes a dropped connection recoverable: the retry
 * carries the same key and the server replays the original result instead of
 * reporting a conflict (docs/02 §6.4).
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
