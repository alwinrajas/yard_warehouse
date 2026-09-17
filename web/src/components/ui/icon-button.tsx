'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Tooltip } from './tooltip'

const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-md',
    'transition-colors duration-fast ease-standard',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-anodic-600 text-graphite-0 hover:bg-anodic-700',
        secondary: 'border border-graphite-300 bg-graphite-0 text-graphite-600 hover:bg-graphite-50',
        ghost: 'text-graphite-500 hover:bg-graphite-100 hover:text-graphite-800',
        danger: 'text-signal-danger-fg hover:bg-signal-danger-surface',
      },
      size: { sm: 'size-7', md: 'size-8', lg: 'size-9' },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
)

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButtonVariants> & {
    /** Required. An icon-only control must always be announced (docs/21 §5.1). */
    label: string
    icon: ReactNode
    showTooltip?: boolean
  }

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant, size, label, icon, showTooltip = true, type, ...props },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {icon}
    </button>
  )

  return showTooltip ? <Tooltip content={label}>{button}</Tooltip> : button
})
