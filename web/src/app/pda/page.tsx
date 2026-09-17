import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeftRight,
  ClipboardCheck,
  History,
  MapPin,
  Package,
  Search,
  TriangleAlert,
  Truck,
} from 'lucide-react'

export const metadata: Metadata = { title: 'PDA' }

const ACTIONS = [
  { href: '/pda/put-away', label: 'Put-Away', icon: Package },
  { href: '/pda/dispatch', label: 'Dispatch', icon: Truck },
  { href: '/pda/movement', label: 'Move', icon: ArrowLeftRight },
  { href: '/pda/search', label: 'Search', icon: Search },
  { href: '/pda/stock-check', label: 'Stock Check', icon: ClipboardCheck },
  { href: '/pda/location-enquiry', label: 'Location', icon: MapPin },
]

/** D-02 Home (docs/24 §4). Six large tiles, thumb-reachable. */
export default function PdaHomePage() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-graphite-800 bg-graphite-900 text-graphite-50 active:bg-anodic-900"
          >
            <action.icon className="size-8 text-anodic-300" aria-hidden />
            <span className="text-body font-medium uppercase tracking-wide">{action.label}</span>
          </Link>
        ))}
      </div>

      <Link
        href="/pda/exceptions"
        className="flex min-h-16 items-center justify-center gap-2 rounded-lg border border-signal-dark-warning-fg bg-graphite-900 text-signal-dark-warning-fg active:bg-graphite-800"
      >
        <TriangleAlert className="size-5" aria-hidden />
        <span className="text-body font-medium uppercase tracking-wide">Hold / Exception</span>
      </Link>

      <Link
        href="/pda/recent-activity"
        className="flex min-h-16 items-center justify-center gap-2 rounded-lg border border-graphite-800 bg-graphite-900 text-graphite-300 active:bg-graphite-800"
      >
        <History className="size-5" aria-hidden />
        <span className="text-body uppercase tracking-wide">Recent activity</span>
      </Link>
    </div>
  )
}
