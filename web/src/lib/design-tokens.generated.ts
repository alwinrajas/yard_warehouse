/* GENERATED FILE - DO NOT EDIT.
 * Source: design-tokens/tokens.json
 * Regenerate: node design-tokens/generate.mjs
 * Spec: docs/21-design-system.md
 */

/* eslint-disable */

/**
 * Literal colour values, for the handful of places that cannot use a CSS variable:
 * the theme-color meta tag, canvas drawing, and generated file output. Everything
 * that renders in the DOM must use the token classes instead.
 */
export const RAW_COLORS = {
  graphite: {
  '0': '#FFFFFF',
  '25': '#FBFCFD',
  '50': '#F6F8FA',
  '100': '#EDF0F4',
  '200': '#DDE3EA',
  '300': '#C3CCD8',
  '400': '#9AA7B8',
  '500': '#647183',
  '600': '#536074',
  '700': '#3D4859',
  '800': '#2A3342',
  '900': '#1B2230',
  '950': '#11161F',
  },
  anodic: {
  '50': '#EEF4FB',
  '100': '#D8E6F6',
  '200': '#B3CDEC',
  '300': '#7FAADE',
  '400': '#4A84CB',
  '500': '#2A66B3',
  '600': '#1E5196',
  '700': '#184179',
  '800': '#143560',
  '900': '#112B4D',
  },
} as const

export const STATUS_KEYS = ['at-collection', 'stored', 'in-movement', 'staged', 'dispatched', 'on-hold', 'damaged', 'exception'] as const
export type StatusKey = (typeof STATUS_KEYS)[number]

export const LOCATION_STATE_KEYS = ['empty', 'occupied', 'full', 'blocked', 'inactive'] as const
export type LocationStateKey = (typeof LOCATION_STATE_KEYS)[number]

export const AGEING_KEYS = ['fresh', 'normal', 'attention', 'critical'] as const
export type AgeingKey = (typeof AGEING_KEYS)[number]

export type StatusToken = {
  key: StatusKey
  label: string
  icon: string
  className: string
  dotClassName: string
}

export type LocationStateToken = {
  key: LocationStateKey
  label: string
  pattern: 'none' | 'hatch' | 'dotted'
  className: string
}

export type AgeingToken = {
  key: AgeingKey
  label: string
  className: string
}

export const STATUS_TOKENS: Record<StatusKey, StatusToken> = {
  'at-collection': {
    key: 'at-collection',
    label: "At Collection Point",
    icon: 'Inbox',
    className: 'text-status-at-collection-fg bg-status-at-collection-surface border-status-at-collection-border',
    dotClassName: 'bg-status-at-collection-dot',
  },
  'stored': {
    key: 'stored',
    label: "Stored",
    icon: 'Package',
    className: 'text-status-stored-fg bg-status-stored-surface border-status-stored-border',
    dotClassName: 'bg-status-stored-dot',
  },
  'in-movement': {
    key: 'in-movement',
    label: "In Movement",
    icon: 'ArrowLeftRight',
    className: 'text-status-in-movement-fg bg-status-in-movement-surface border-status-in-movement-border',
    dotClassName: 'bg-status-in-movement-dot',
  },
  'staged': {
    key: 'staged',
    label: "Staged for Dispatch",
    icon: 'Truck',
    className: 'text-status-staged-fg bg-status-staged-surface border-status-staged-border',
    dotClassName: 'bg-status-staged-dot',
  },
  'dispatched': {
    key: 'dispatched',
    label: "Dispatched",
    icon: 'CircleCheck',
    className: 'text-status-dispatched-fg bg-status-dispatched-surface border-status-dispatched-border',
    dotClassName: 'bg-status-dispatched-dot',
  },
  'on-hold': {
    key: 'on-hold',
    label: "On Hold",
    icon: 'CirclePause',
    className: 'text-status-on-hold-fg bg-status-on-hold-surface border-status-on-hold-border',
    dotClassName: 'bg-status-on-hold-dot',
  },
  'damaged': {
    key: 'damaged',
    label: "Damaged",
    icon: 'TriangleAlert',
    className: 'text-status-damaged-fg bg-status-damaged-surface border-status-damaged-border',
    dotClassName: 'bg-status-damaged-dot',
  },
  'exception': {
    key: 'exception',
    label: "Exception",
    icon: 'OctagonAlert',
    className: 'text-status-exception-fg bg-status-exception-surface border-status-exception-border',
    dotClassName: 'bg-status-exception-dot',
  },
}

export const LOCATION_STATE_TOKENS: Record<LocationStateKey, LocationStateToken> = {
  'empty': {
    key: 'empty',
    label: "Empty",
    pattern: 'none',
    className: 'bg-location-empty-fill border-location-empty-border',
  },
  'occupied': {
    key: 'occupied',
    label: "Occupied",
    pattern: 'none',
    className: 'bg-location-occupied-fill border-location-occupied-border',
  },
  'full': {
    key: 'full',
    label: "At capacity",
    pattern: 'none',
    className: 'bg-location-full-fill border-location-full-border',
  },
  'blocked': {
    key: 'blocked',
    label: "Blocked",
    pattern: 'hatch',
    className: 'bg-location-blocked-fill border-location-blocked-border',
  },
  'inactive': {
    key: 'inactive',
    label: "Inactive",
    pattern: 'dotted',
    className: 'bg-location-inactive-fill border-location-inactive-border',
  },
}

export const AGEING_TOKENS: Record<AgeingKey, AgeingToken> = {
  'fresh': {
    key: 'fresh',
    label: "0-7 days",
    className: 'text-ageing-fresh',
  },
  'normal': {
    key: 'normal',
    label: "8-15 days",
    className: 'text-ageing-normal',
  },
  'attention': {
    key: 'attention',
    label: "16-30 days",
    className: 'text-ageing-attention',
  },
  'critical': {
    key: 'critical',
    label: "Over 30 days",
    className: 'text-ageing-critical',
  },
}
