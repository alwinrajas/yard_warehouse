/**
 * Copies the woff2 subsets ALU TRACK uses out of the @fontsource packages into
 * src/app/fonts, where next/font/local picks them up.
 *
 * The files are committed so a production or Docker build needs no network
 * access for fonts (docs/12 §4). Re-run after changing a font or a weight.
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'src/app/fonts')
mkdirSync(out, { recursive: true })

const COPY = [
  ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'inter-variable-latin.woff2'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2', 'jetbrains-mono-400.woff2'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2', 'jetbrains-mono-500.woff2'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2', 'jetbrains-mono-600.woff2'],
]

for (const [from, to] of COPY) {
  copyFileSync(join(here, 'node_modules', from), join(out, to))
  console.log('copied', to)
}
