import { LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/cn'

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <LoaderCircle className={cn('size-4 animate-spin text-graphite-400', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}
