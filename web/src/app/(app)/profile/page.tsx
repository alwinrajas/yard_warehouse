import type { Metadata } from 'next'
import { Suspense } from 'react'

import { getSession } from '@/lib/auth/session.server'

import { ProfileScreen } from './profile-screen'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const session = await getSession()
  // The layout already guarantees a session; this narrows the type.
  if (!session) return null
  return (
    <Suspense>
      <ProfileScreen mustChangePassword={session.mustChangePassword ?? false} />
    </Suspense>
  )
}
