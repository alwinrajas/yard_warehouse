import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * JSX is transformed by esbuild with the automatic runtime. @vitejs/plugin-react
 * is deliberately not used: it pulls its own Vite major, which conflicts with the
 * one Vitest bundles, and nothing here needs Fast Refresh.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws by design when bundled for the client. Tests run in
      // a jsdom environment but exercise server modules directly, so it is
      // stubbed out here rather than weakening the guard in source.
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
