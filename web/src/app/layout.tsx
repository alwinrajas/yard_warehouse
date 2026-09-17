import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'

import { APP_FULL_NAME, APP_NAME, APP_TAGLINE } from '@/lib/app-config'
import { RAW_COLORS } from '@/lib/design-tokens.generated'

import './globals.css'

/**
 * Fonts are self-hosted from committed woff2 subsets — no network access is
 * needed at build time, which keeps Docker and CI builds hermetic (docs/12 §4),
 * and no external request sits on the critical path at runtime (docs/21 §3).
 *
 * JetBrains Mono carries every identifier in the product. Its slashed zero and
 * unambiguous 1/l/I are the reason PAL-10245 cannot be misread (UX-01).
 * Files are synced from @fontsource by scripts/sync-fonts.mjs; both faces are
 * OFL licensed and the licences sit alongside them.
 */
const inter = localFont({
  src: [{ path: './fonts/inter-variable-latin.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

const jetbrainsMono = localFont({
  src: [
    { path: './fonts/jetbrains-mono-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/jetbrains-mono-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/jetbrains-mono-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
})

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: `${APP_FULL_NAME}. ${APP_TAGLINE}`,
  applicationName: APP_NAME,
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: RAW_COLORS.graphite[950],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
