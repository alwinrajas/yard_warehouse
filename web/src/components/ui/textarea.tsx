'use client'

import { forwardRef, useState, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControlProps } from './field'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean
  showCount?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, showCount, maxLength, onChange, defaultValue, value, ...props },
  ref,
) {
  const fieldProps = useFieldControlProps()
  const hasError = invalid || fieldProps['aria-invalid']
  const [count, setCount] = useState(String(value ?? defaultValue ?? '').length)

  return (
    <div className="flex flex-col gap-1">
      <textarea
        ref={ref}
        rows={3}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          setCount(event.target.value.length)
          onChange?.(event)
        }}
        className={cn(
          'min-h-[4.5rem] resize-y rounded-md border bg-graphite-0 px-2.5 py-2',
          'text-body-sm text-graphite-900 outline-none placeholder:text-graphite-500',
          'transition-colors duration-fast ease-standard',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anodic-400',
          hasError ? 'border-signal-danger-border' : 'border-graphite-300 hover:border-graphite-400',
          'disabled:cursor-not-allowed disabled:bg-graphite-100',
          className,
        )}
        {...fieldProps}
        {...props}
      />
      {showCount && maxLength ? (
        <span className="self-end text-caption tabular-nums text-graphite-400">
          {count} / {maxLength}
        </span>
      ) : null}
    </div>
  )
})
