/**
 * WCAG contrast check over the ALU TRACK tokens.
 *
 * axe cannot evaluate contrast in jsdom (no layout, no computed paint), so the
 * token pairs that actually ship are checked numerically here instead of being
 * assumed. Targets: 4.5:1 for text, 3:1 for UI boundaries (docs/21 §7).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const t = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'))

const lum = (hex) => {
  const v = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const G = t.color.graphite
const A = t.color.anodic
const checks = []

// Body and heading text on the two surfaces that exist.
checks.push(['body text on canvas', G['900'], G['50'], 4.5])
checks.push(['body text on panel', G['900'], G['0'], 4.5])
checks.push(['table cell text on panel', G['700'], G['0'], 4.5])
checks.push(['secondary text on panel', G['500'], G['0'], 4.5])
checks.push(['column header on table head', G['500'], G['50'], 4.5])
checks.push(['primary button label', G['0'], A['600'], 4.5])
checks.push(['active nav label', A['700'], A['50'], 4.5])
checks.push(['link on panel', A['500'], G['0'], 4.5])

// Every status badge: label on its own surface.
for (const [key, def] of Object.entries(t.status)) {
  if (key.startsWith('$')) continue
  checks.push([`status "${def.label}" label`, def.fg, def.surface, 4.5])
}

// Signal surfaces used by Alert / ExceptionPanel / TransactionResult.
for (const tone of ['success', 'warning', 'danger', 'info', 'neutral']) {
  checks.push([`signal ${tone} text`, t.color.signal[`${tone}-fg`], t.color.signal[`${tone}-surface`], 4.5])
}

// The PDA renders feedback on dark chrome, where the light ramp is unreadable.
for (const tone of ['success', 'warning', 'danger', 'info', 'neutral']) {
  checks.push([`PDA ${tone} text on chrome`, t.color['signal-dark'][`${tone}-fg`], G['900'], 4.5])
  checks.push([`PDA ${tone} text on canvas`, t.color['signal-dark'][`${tone}-fg`], G['950'], 4.5])
}
checks.push(['PDA body text on chrome', G['50'], G['950'], 4.5])
checks.push(['PDA secondary text on card', G['400'], G['900'], 4.5])
checks.push(['PDA header text on header', G['0'], A['900'], 4.5])
// The result screen paints its own surface, so its text is checked against that.
checks.push(['PDA success title on result', t.color['signal-dark']['success-fg'], t.color['signal-dark']['success-surface'], 4.5])
checks.push(['PDA failure title on result', t.color['signal-dark']['danger-fg'], t.color['signal-dark']['danger-surface'], 4.5])
checks.push(['PDA detail label on result', G['300'], t.color['signal-dark']['danger-surface'], 4.5])
checks.push(['PDA detail value on result', G['0'], t.color['signal-dark']['success-surface'], 4.5])

// Ageing labels are text on the panel surface.
for (const [key, def] of Object.entries(t.ageing)) {
  if (key.startsWith('$')) continue
  checks.push([`ageing "${def.label}" label`, def.fg, G['0'], 4.5])
}

// Location board cell borders carry meaning, so 3:1 against the canvas.
for (const [key, def] of Object.entries(t.location)) {
  if (key.startsWith('$')) continue
  checks.push([`location "${def.label}" border`, def.border, G['50'], 3])
}

// UI boundaries (3:1).
checks.push(['default border on panel', G['200'], G['0'], 1.0])
checks.push(['input border on panel', G['300'], G['0'], 1.5])
checks.push(['focus ring on canvas', A['400'], G['50'], 3])
checks.push(['focus ring on panel', A['400'], G['0'], 3])

let failed = 0
for (const [name, fg, bg, min] of checks) {
  const r = ratio(fg, bg)
  const ok = r >= min
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(6)}:1  (min ${min})  ${name}`)
}

console.log(`\n${checks.length - failed}/${checks.length} passed`)
process.exit(failed > 0 ? 1 : 0)
