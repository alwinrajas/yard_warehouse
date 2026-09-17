import type { Metadata } from 'next'

import { PdaRecentActivity } from './pda-recent-activity'

export const metadata: Metadata = { title: 'Recent activity · PDA' }

export default function Page() {
  return <PdaRecentActivity />
}
