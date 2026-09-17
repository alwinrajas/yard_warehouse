import { redirect } from 'next/navigation'

/**
 * Root. Authenticated users are sent to their landing route; everyone else is
 * redirected to the login screen by middleware before this runs.
 */
export default function RootPage() {
  redirect('/dashboard')
}
