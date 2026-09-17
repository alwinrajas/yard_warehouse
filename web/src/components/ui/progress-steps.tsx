import { Check } from 'lucide-react'

import { cn } from '@/lib/cn'

/**
 * Step indicator for put-away, movement, dispatch and verification flows.
 * The operator must always know where they are and how much is left (docs/23 §7).
 */
export type Step = { id: string; label: string }

export function ProgressSteps({
  steps,
  current,
  className,
}: {
  steps: Step[]
  /** Zero-based index of the active step. */
  current: number
  className?: string
}) {
  return (
    <ol
      className={cn('flex items-center gap-2', className)}
      aria-label={`Step ${current + 1} of ${steps.length}`}
    >
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo'
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <span
              aria-current={state === 'active' ? 'step' : undefined}
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full text-overline',
                state === 'done' && 'bg-anodic-600 text-graphite-0',
                state === 'active' && 'bg-anodic-600 text-graphite-0',
                state === 'todo' && 'border border-graphite-300 bg-graphite-0 text-graphite-400',
              )}
            >
              {state === 'done' ? <Check className="size-3" aria-hidden /> : index + 1}
            </span>
            <span
              className={cn(
                'truncate text-body-sm',
                state === 'active' ? 'font-medium text-graphite-900' : 'text-graphite-500',
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  'h-px flex-1',
                  index < current ? 'bg-anodic-600' : 'bg-graphite-200',
                )}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
