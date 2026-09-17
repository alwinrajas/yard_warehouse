#!/usr/bin/env node
/**
 * Assembles the standalone server bundle.
 *
 * `next build` with `output: 'standalone'` emits a server that expects the
 * static assets and public files alongside it, but does not copy them — and
 * `next start` does not work against that output at all. Running the wrong one
 * fails at request time with a React Client Manifest error rather than at
 * build time, so the correct command is the only one exposed.
 */
import { cpSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const web = join(dirname(fileURLToPath(import.meta.url)), '..')
const standalone = join(web, '.next', 'standalone')

if (!existsSync(standalone)) {
  console.error('No .next/standalone — run `npm run build` first.')
  process.exit(1)
}

cpSync(join(web, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true })

if (existsSync(join(web, 'public'))) {
  cpSync(join(web, 'public'), join(standalone, 'public'), { recursive: true })
}

console.log('standalone bundle ready: node .next/standalone/server.js')
