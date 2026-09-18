import type { ReactNode } from 'react'

import { LogoMark } from '@/components/layout/logo'
import { APP_ENV, APP_FULL_NAME, APP_VERSION } from '@/lib/app-config'

/**
 * Auth layout — the sign-in surface.
 *
 * A split layout: the product's identity on the left (a lit brand panel), the
 * working form on the right, raised on a card so the first screen the customer
 * sees looks like the product rather than a form on a page.
 *
 * On narrow screens the brand panel drops away and the form column carries a
 * compact mark.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-graphite-0">
      {/* -------------------------------------------------------------- */}
      {/* Brand panel — identity before data                              */}
      {/* -------------------------------------------------------------- */}
      <div className="brand-panel brand-vignette relative hidden w-[46%] max-w-[38rem] flex-col justify-between overflow-hidden p-11 lg:flex xl:p-14">
        <div className="brand-grid absolute inset-0" aria-hidden />
        {/* Hairline inner frame so the gradient reads as crafted, not flat */}
        <div
          className="pointer-events-none absolute inset-5 rounded-3xl border border-graphite-0/10"
          aria-hidden
        />

        <div className="relative">
          <span className="inline-flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-graphite-0/10 ring-1 ring-graphite-0/15 inset-shadow-[0_1px_0_0_rgba(255,255,255,0.18)]">
              <LogoMark flat className="size-6 text-graphite-0" />
            </span>
            <span className="text-body tracking-[0.08em] text-graphite-0">
              <span className="font-bold">ALU</span>
              <span className="font-semibold text-anodic-200">TRACK</span>
            </span>
          </span>
        </div>

        <div className="relative max-w-lg">
          <p className="text-overline uppercase tracking-[0.2em] text-anodic-200/80">
            Yard &amp; warehouse inventory
          </p>
          <h2 className="mt-5 text-[2.125rem] leading-[1.15] font-bold tracking-[-0.025em] text-graphite-0">
            Every pallet, located.
            <br />
            Every move, accounted for.
          </h2>
          <p className="mt-5 text-body text-graphite-200/90">
            {APP_FULL_NAME} gives your team a live digital twin of the yard and warehouse — put-away,
            movement, dispatch and verification in one append-only ledger.
          </p>

          <ul className="mt-9 flex flex-col gap-4">
            {[
              {
                line: 'Live location occupancy across every facility',
                icon: (
                  <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden>
                    <rect
                      x="1.5"
                      y="1.5"
                      width="5"
                      height="5"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <rect
                      x="9.5"
                      y="1.5"
                      width="5"
                      height="5"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <rect
                      x="1.5"
                      y="9.5"
                      width="5"
                      height="5"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <rect
                      x="9.5"
                      y="9.5"
                      width="5"
                      height="5"
                      rx="1"
                      fill="currentColor"
                      fillOpacity="0.35"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                ),
              },
              {
                line: 'Append-only ledger — every move traceable',
                icon: (
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className="size-4"
                    aria-hidden
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  >
                    <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />
                  </svg>
                ),
              },
              {
                line: 'Ageing, holds and exceptions surfaced before they cost you',
                icon: (
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className="size-4"
                    aria-hidden
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  >
                    <circle cx="8" cy="8" r="6.25" />
                    <path d="M8 4.75V8l2.25 1.5" />
                  </svg>
                ),
              },
            ].map((item) => (
              <li key={item.line} className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-graphite-0/10 text-anodic-200 ring-1 ring-graphite-0/10"
                >
                  {item.icon}
                </span>
                <span className="text-body-sm text-graphite-100/90">{item.line}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-caption text-graphite-400">
          © {new Date().getFullYear()} ALU TRACK · Yard &amp; Warehouse Inventory Tracking
        </p>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Form column                                                     */}
      {/* -------------------------------------------------------------- */}
      <div className="auth-canvas relative flex min-w-0 flex-1 flex-col">
        <div className="relative mx-auto flex w-full max-w-[27rem] flex-1 flex-col justify-center px-5 py-12 sm:px-8">
          <div className="mb-7 lg:hidden">
            <LogoMark className="size-9" />
          </div>

          {/* The form is the product's first impression, so it gets the same
              raised-surface treatment as every panel inside the console. */}
          <div className="surface-card rounded-2xl p-6 sm:p-8">{children}</div>
        </div>

        <p className="relative px-6 pb-8 text-center text-caption text-graphite-400 sm:px-10">
          {APP_FULL_NAME} · Controlled distribution — authorised personnel only
          <span className="mt-1 block text-graphite-400/80">
            v{APP_VERSION}
            {APP_ENV !== 'production' ? (
              <span className="ml-1.5 rounded-sm bg-signal-warning-surface px-1 text-signal-warning-fg">
                {APP_ENV}
              </span>
            ) : null}
          </span>
        </p>
      </div>
    </div>
  )
}
