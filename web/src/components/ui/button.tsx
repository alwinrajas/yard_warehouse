'use client'

import { Slot, Slottable } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Button.
 *
 * Loading disables the control and swaps the leading icon for a spinner — the
 * width never changes, so a toolbar does not reflow mid-transaction (docs/21 §5.1).
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl',
    'font-semibold transition-all duration-fast ease-standard shadow-xs',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-anodic-600 text-graphite-0 hover:bg-anodic-700 active:bg-anodic-800 shadow-xs hover:shadow-card',
        secondary:
          'border border-graphite-200/90 bg-graphite-0 text-graphite-800 hover:bg-graphite-50/80 hover:border-graphite-300 active:bg-graphite-100 shadow-xs',
        ghost: 'text-graphite-600 hover:bg-graphite-100/80 hover:text-graphite-900 shadow-none',
        danger: 'bg-signal-danger-fg text-graphite-0 hover:bg-signal-danger-fg/90 active:bg-signal-danger-fg/80 shadow-xs',
        link: 'text-anodic-600 underline-offset-4 hover:underline shadow-none',
      },
      size: {
        sm: 'h-8 px-3 text-caption font-semibold rounded-lg',
        md: 'h-9.5 px-4 text-body-sm font-semibold rounded-xl',
        lg: 'h-11 px-5.5 text-body font-semibold rounded-xl',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', fullWidth: false },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    loadingLabel?: string
    leftIcon?: ReactNode
    rightIcon?: ReactNode
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    fullWidth,
    asChild = false,
    loading = false,
    loadingLabel,
    leftIcon,
    rightIcon,
    children,
    disabled,
    type,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : 'button'
  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4'

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className={cn(iconSize, 'animate-spin')} aria-hidden /> : leftIcon}
      {/* Slottable marks the real child for Slot when asChild is set, so a
          <Button asChild><Link/></Button> can still carry icons. Without it Slot
          receives three children and throws. */}
      <Slottable>{loading && loadingLabel ? loadingLabel : children}</Slottable>
      {!loading && rightIcon}
    </Comp>
  )
})

export { buttonVariants }
