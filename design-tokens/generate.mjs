#!/usr/bin/env node
/**
 * ALU TRACK design-token generator.
 *
 * Reads design-tokens/tokens.json (the single source of truth) and emits:
 *   web/src/styles/tokens.generated.css      Tailwind v4 @theme block
 *   web/src/lib/design-tokens.generated.ts   status / location / ageing maps
 *   design-tokens/generated/Tokens.kt        the same values for the Compose PDA
 *
 * Run with `npm run tokens` from web/, or `node design-tokens/generate.mjs`.
 * Generated files are committed so CI can assert they are current
 * (docs/26 §9 `status-tokens-current`).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const tokens = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'))

const BANNER = (src) =>
  `/* GENERATED FILE - DO NOT EDIT.\n * Source: design-tokens/tokens.json\n * Regenerate: node design-tokens/generate.mjs\n * Spec: docs/21-design-system.md\n */\n`.replace(
    '/*',
    src === 'kt' ? '/*' : '/*',
  )

const isMeta = (k) => k.startsWith('$')
const entries = (o) => Object.entries(o ?? {}).filter(([k]) => !isMeta(k))

/* ------------------------------------------------------------------ CSS */

function generateCss() {
  const lines = []
  const push = (s = '') => lines.push(s)

  push(BANNER('css'))
  push('@theme {')

  push('  /* Wipe Tailwind\'s default palette, type scale and shadows so that ONLY')
  push('     ALU TRACK tokens exist. `bg-red-500` and `text-xl` do not resolve —')
  push('     an off-system colour is a build error, not a review comment. */')
  push('  --color-*: initial;')
  push('  --text-*: initial;')
  push('  --shadow-*: initial;')
  push('  --color-transparent: transparent;')
  push('  --color-current: currentColor;')
  push('  --color-inherit: inherit;')
  push('')
  push('  /* --- palette: graphite (cool neutral) --- */')
  for (const [step, hex] of entries(tokens.color.graphite)) {
    push(`  --color-graphite-${step}: ${hex};`)
  }

  push('')
  push('  /* --- palette: anodic blue (the only brand colour) --- */')
  for (const [step, hex] of entries(tokens.color.anodic)) {
    push(`  --color-anodic-${step}: ${hex};`)
  }

  push('')
  push('  /* --- semantic feedback --- */')
  for (const [name, hex] of entries(tokens.color.signal)) {
    push(`  --color-signal-${name}: ${hex};`)
  }

  push('')
  push('  /* --- semantic feedback on dark chrome (the PDA, docs/24 §3) --- */')
  for (const [name, hex] of entries(tokens.color['signal-dark'])) {
    push(`  --color-signal-dark-${name}: ${hex};`)
  }

  push('')
  push('  /* --- pallet status (docs/21 §2.4) --- */')
  for (const [key, def] of entries(tokens.status)) {
    for (const part of ['fg', 'surface', 'border', 'dot']) {
      push(`  --color-status-${key}-${part}: ${def[part]};`)
    }
  }

  push('')
  push('  /* --- location occupancy (docs/21 §2.5) --- */')
  for (const [key, def] of entries(tokens.location)) {
    push(`  --color-location-${key}-fill: ${def.fill};`)
    push(`  --color-location-${key}-border: ${def.border};`)
  }

  push('')
  push('  /* --- ageing scale (docs/21 §2.6) --- */')
  for (const [key, def] of entries(tokens.ageing)) {
    push(`  --color-ageing-${key}: ${def.fg};`)
  }

  push('')
  push('  /* --- typography --- */')
  push(`  --font-sans: ${tokens.font.sans};`)
  push(`  --font-mono: ${tokens.font.mono};`)
  for (const [key, def] of entries(tokens.text)) {
    push(`  --text-${key}: ${def.size};`)
    push(`  --text-${key}--line-height: ${def.lineHeight};`)
    push(`  --text-${key}--font-weight: ${def.weight};`)
    push(`  --text-${key}--letter-spacing: ${def.tracking};`)
  }

  push('')
  push('  /* --- radius --- */')
  for (const [key, v] of entries(tokens.radius)) push(`  --radius-${key}: ${v};`)

  push('')
  push('  /* --- elevation: three levels only --- */')
  for (const [key, v] of entries(tokens.shadow)) push(`  --shadow-${key}: ${v};`)

  push('')
  push('  /* --- motion --- */')
  push(`  --ease-standard: ${tokens.motion.ease};`)
  for (const key of ['fast', 'base', 'slow']) {
    push(`  --duration-${key}: ${tokens.motion[key]};`)
  }

  push('')
  push('  /* --- layout --- */')
  for (const [key, v] of entries(tokens.layout)) push(`  --layout-${key}: ${v};`)

  push('}')
  push('')
  return lines.join('\n')
}

/* ------------------------------------------------------------------- TS */

function generateTs() {
  const statusKeys = entries(tokens.status).map(([k]) => k)
  const locationKeys = entries(tokens.location).map(([k]) => k)
  const ageingKeys = entries(tokens.ageing).map(([k]) => k)

  const statusEntries = entries(tokens.status)
    .map(
      ([key, def]) => `  '${key}': {
    key: '${key}',
    label: ${JSON.stringify(def.label)},
    icon: '${def.icon}',
    className: 'text-status-${key}-fg bg-status-${key}-surface border-status-${key}-border',
    dotClassName: 'bg-status-${key}-dot',
  },`,
    )
    .join('\n')

  const locationEntries = entries(tokens.location)
    .map(
      ([key, def]) => `  '${key}': {
    key: '${key}',
    label: ${JSON.stringify(def.label)},
    pattern: '${def.pattern}',
    className: 'bg-location-${key}-fill border-location-${key}-border',
  },`,
    )
    .join('\n')

  const ageingEntries = entries(tokens.ageing)
    .map(
      ([key, def]) => `  '${key}': {
    key: '${key}',
    label: ${JSON.stringify(def.label)},
    className: 'text-ageing-${key}',
  },`,
    )
    .join('\n')

  const graphite = entries(tokens.color.graphite)
    .map(([step, hex]) => `  '${step}': '${hex}',`)
    .join('\n')
  const anodic = entries(tokens.color.anodic)
    .map(([step, hex]) => `  '${step}': '${hex}',`)
    .join('\n')

  return `${BANNER('ts')}
/* eslint-disable */

/**
 * Literal colour values, for the handful of places that cannot use a CSS variable:
 * the theme-color meta tag, canvas drawing, and generated file output. Everything
 * that renders in the DOM must use the token classes instead.
 */
export const RAW_COLORS = {
  graphite: {
${graphite}
  },
  anodic: {
${anodic}
  },
} as const

export const STATUS_KEYS = [${statusKeys.map((k) => `'${k}'`).join(', ')}] as const
export type StatusKey = (typeof STATUS_KEYS)[number]

export const LOCATION_STATE_KEYS = [${locationKeys.map((k) => `'${k}'`).join(', ')}] as const
export type LocationStateKey = (typeof LOCATION_STATE_KEYS)[number]

export const AGEING_KEYS = [${ageingKeys.map((k) => `'${k}'`).join(', ')}] as const
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
${statusEntries}
}

export const LOCATION_STATE_TOKENS: Record<LocationStateKey, LocationStateToken> = {
${locationEntries}
}

export const AGEING_TOKENS: Record<AgeingKey, AgeingToken> = {
${ageingEntries}
}
`
}

/* ----------------------------------------------------------------- Kotlin */

function generateKotlin() {
  const composeColor = (hex) => `Color(0xFF${hex.replace('#', '').toUpperCase()})`
  const lines = []
  lines.push('// GENERATED FILE - DO NOT EDIT.')
  lines.push('// Source: design-tokens/tokens.json')
  lines.push('// Regenerate: node design-tokens/generate.mjs')
  lines.push('// Consumed by the ALU TRACK PDA application (docs/24-pda-screens.md).')
  lines.push('')
  lines.push('package com.redmind.alutrack.ui.theme')
  lines.push('')
  lines.push('import androidx.compose.ui.graphics.Color')
  lines.push('')
  lines.push('object AluTrackPalette {')
  for (const [step, hex] of entries(tokens.color.graphite)) {
    lines.push(`    val Graphite${step} = ${composeColor(hex)}`)
  }
  for (const [step, hex] of entries(tokens.color.anodic)) {
    lines.push(`    val Anodic${step} = ${composeColor(hex)}`)
  }
  lines.push('}')
  lines.push('')
  lines.push('data class StatusToken(')
  lines.push('    val key: String,')
  lines.push('    val label: String,')
  lines.push('    val fg: Color,')
  lines.push('    val surface: Color,')
  lines.push('    val border: Color,')
  lines.push('    val dot: Color,')
  lines.push(')')
  lines.push('')
  lines.push('object AluTrackStatus {')
  lines.push('    val tokens: Map<String, StatusToken> = mapOf(')
  for (const [key, def] of entries(tokens.status)) {
    lines.push(
      `        "${key}" to StatusToken("${key}", ${JSON.stringify(def.label)}, ` +
        `${composeColor(def.fg)}, ${composeColor(def.surface)}, ` +
        `${composeColor(def.border)}, ${composeColor(def.dot)}),`,
    )
  }
  lines.push('    )')
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

/* ------------------------------------------------------------------ write */

const outputs = [
  [join(repoRoot, 'web/src/styles/tokens.generated.css'), generateCss()],
  [join(repoRoot, 'web/src/lib/design-tokens.generated.ts'), generateTs()],
  [join(repoRoot, 'design-tokens/generated/Tokens.kt'), generateKotlin()],
]

let changed = 0
for (const [path, content] of outputs) {
  mkdirSync(dirname(path), { recursive: true })
  let previous = null
  try {
    previous = readFileSync(path, 'utf8')
  } catch {
    /* new file */
  }
  if (previous !== content) {
    writeFileSync(path, content, 'utf8')
    changed += 1
  }
  console.log(`${previous === content ? 'unchanged' : 'written  '}  ${path.replace(repoRoot, '.')}`)
}

if (process.argv.includes('--check') && changed > 0) {
  console.error(`\n${changed} generated file(s) were stale. Run: node design-tokens/generate.mjs`)
  process.exit(1)
}
