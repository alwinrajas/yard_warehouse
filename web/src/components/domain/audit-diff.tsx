import { cn } from '@/lib/cn'

/** Before/after for corrections and audit records (docs/21 §5.2). */
export function AuditDiff({
  before,
  after,
  className,
}: {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  className?: string
}) {
  const keys = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ).sort()

  if (keys.length === 0) {
    return <p className="text-body-sm text-graphite-500">No field-level changes recorded.</p>
  }

  const render = (value: unknown) =>
    value === null || value === undefined || value === ''
      ? '—'
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)

  return (
    <div className={cn('overflow-hidden rounded-lg border border-graphite-200', className)}>
      <table className="w-full text-body-sm">
        <caption className="sr-only">Values before and after the change</caption>
        <thead className="bg-graphite-50">
          <tr className="border-b border-graphite-200">
            <th scope="col" className="px-3 py-2 text-left text-overline uppercase text-graphite-500">
              Field
            </th>
            <th scope="col" className="px-3 py-2 text-left text-overline uppercase text-graphite-500">
              Before
            </th>
            <th scope="col" className="px-3 py-2 text-left text-overline uppercase text-graphite-500">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const from = render(before?.[key])
            const to = render(after?.[key])
            const changed = from !== to
            return (
              <tr key={key} className="border-b border-graphite-200 last:border-0">
                <td className="px-3 py-1.5 text-graphite-600">{key}</td>
                <td className={cn('px-3 py-1.5 font-mono text-mono', changed ? 'text-graphite-500 line-through' : 'text-graphite-400')}>
                  {from}
                </td>
                <td className={cn('px-3 py-1.5 font-mono text-mono', changed ? 'text-anodic-700' : 'text-graphite-400')}>
                  {to}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
