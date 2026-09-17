import type { Metadata } from 'next'

import { MastersIndex } from './masters-index'

export const metadata: Metadata = { title: 'Configuration' }

export default function Page() {
  return <MastersIndex />
}
