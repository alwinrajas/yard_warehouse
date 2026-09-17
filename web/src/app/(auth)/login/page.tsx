import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Logo } from '@/components/layout/logo'
import { Skeleton } from '@/components/ui'
import { APP_TAGLINE } from '@/lib/app-config'

import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

/**
 * W-00 Login (docs/23 §2).
 *
 * Split layout: brand panel left, form right. No photography, no stock imagery —
 * a single isometric rack elevation drawn from the same geometry as the logo mark.
 */
export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-graphite-950 p-10 lg:flex">
        <Logo onDark />

        <div className="max-w-md">
          <h1 className="text-h1 text-graphite-0">
            Yard &amp; Warehouse Inventory Tracking &amp; Traceability
          </h1>
          <p className="mt-3 text-body text-graphite-400">{APP_TAGLINE}</p>

          <svg
            viewBox="0 0 320 150"
            fill="none"
            aria-hidden
            className="mt-10 w-full max-w-sm text-anodic-600"
          >
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={8 + col * 78}
                  y={8 + row * 46}
                  width="66"
                  height="34"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity={row === 1 && col === 2 ? 1 : 0.28}
                  fill={row === 1 && col === 2 ? 'currentColor' : 'none'}
                  fillOpacity={row === 1 && col === 2 ? 0.22 : 0}
                />
              )),
            )}
          </svg>
        </div>

        <p className="text-caption text-graphite-500">
          Production collection point → put-away → storage → movement → dispatch
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-90">
          <div className="lg:hidden">
            <Logo />
          </div>
          {/* LoginForm reads `?next=` to preserve a deep link through sign-in,
              so it needs a boundary to prerender the shell around it. */}
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

function LoginFormFallback() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  )
}
