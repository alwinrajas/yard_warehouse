import type { Metadata } from 'next'

import { PdaLocationEnquiry } from './pda-location-enquiry'

export const metadata: Metadata = { title: 'Location · PDA' }

export default function Page() {
  return <PdaLocationEnquiry />
}
