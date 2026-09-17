import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'

import { Providers } from '../providers'
import { REVIEW_SESSION } from './review-data'

export const metadata: Metadata = {
  title: 'Design System',
}

/**
 * The foundation gallery runs inside the real AppShell with a review session, so
 * what is being reviewed is the actual shell, sidebar and top bar — not a mock-up
 * of them.
 *
 * It is a development surface: it renders a fabricated session and fabricated
 * rows, and it is not behind authentication. A production deployment must not
 * serve it, so it 404s there rather than relying on nobody finding the URL.
 */
export default function FoundationLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <Providers session={REVIEW_SESSION}>
      <AppShell badges={{ exceptions: 3, verifications: 1 }} notificationCount={4}>
        {children}
      </AppShell>
    </Providers>
  )
}
