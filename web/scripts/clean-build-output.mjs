#!/usr/bin/env node
/**
 * Clears the previous build's output, keeping the compiler cache.
 *
 * `next build` overwrites its output but never removes files a previous build
 * left behind, and the standalone bundle is assembled by copying into that same
 * tree. Stale server chunks then sit alongside fresh ones and the server dies at
 * request time with `Cannot find module './NNNN.js'` — a failure that looks like
 * a code bug and is not. `.next/cache` is kept, so builds stay incremental.
 */
import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const next = join(dirname(fileURLToPath(import.meta.url)), '..', '.next')

for (const dir of ['standalone', 'server', 'static']) {
  rmSync(join(next, dir), { recursive: true, force: true })
}
