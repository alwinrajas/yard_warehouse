import { Badge } from '@/components/ui'

/**
 * Master-record status. Deliberately not StatusBadge — that is reserved for the
 * BRD pallet statuses, and reusing it here would dilute a vocabulary the whole
 * operational UI depends on (docs/21 §2.4).
 */
export function RecordStatus({ active, blocked }: { active: boolean; blocked?: boolean }) {
  if (blocked) return <Badge tone="warning">Blocked</Badge>
  return active ? <Badge tone="neutral">Active</Badge> : <Badge tone="outline">Inactive</Badge>
}
