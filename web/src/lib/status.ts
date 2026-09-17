/**
 * Status helpers.
 *
 * Re-exports the generated token maps and adds the lookup helpers screens use.
 * The generated file comes from design-tokens/tokens.json, which is also the
 * source for the PDA's Tokens.kt — web and PDA cannot disagree about what
 * "On Hold" looks like (docs/21 §9).
 */
export {
  STATUS_KEYS,
  STATUS_TOKENS,
  LOCATION_STATE_KEYS,
  LOCATION_STATE_TOKENS,
  AGEING_KEYS,
  AGEING_TOKENS,
  type StatusKey,
  type StatusToken,
  type LocationStateKey,
  type LocationStateToken,
  type AgeingKey,
  type AgeingToken,
} from './design-tokens.generated'

import {
  STATUS_TOKENS,
  LOCATION_STATE_TOKENS,
  type LocationStateKey,
  type StatusKey,
} from './design-tokens.generated'

/**
 * Derive the single display status from the server's two-axis model
 * (docs/05 §1): block state wins when set, otherwise lifecycle status.
 * Users only ever see the BRD's seven status names.
 */
export function displayStatus(
  lifecycle: StatusKey,
  blockState?: 'none' | 'on-hold' | 'damaged' | 'exception' | null,
): StatusKey {
  if (!blockState || blockState === 'none') return lifecycle
  return blockState
}

export function statusLabel(key: StatusKey): string {
  return STATUS_TOKENS[key].label
}

export function locationStateLabel(key: LocationStateKey): string {
  return LOCATION_STATE_TOKENS[key].label
}

/** Statuses that keep a pallet in active inventory. */
export const ACTIVE_STATUSES: StatusKey[] = [
  'at-collection',
  'stored',
  'in-movement',
  'staged',
  'on-hold',
  'damaged',
  'exception',
]

/** Statuses that block dispatch through the normal flow (docs/05 §1). */
export const DISPATCH_BLOCKING_STATUSES: StatusKey[] = ['on-hold', 'damaged', 'exception']
