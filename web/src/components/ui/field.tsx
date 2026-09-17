'use client'

import { createContext, useContext, useId, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Field — the single wrapper for every form control.
 *
 * Owns label association, description, required marking and error announcement,
 * so no screen has to remember to wire aria-describedby correctly (docs/21 §7).
 */
type FieldContextValue = {
  id: string
  descriptionId: string
  errorId: string
  hasError: boolean
  required: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

export function useField() {
  return useContext(FieldContext)
}

/** Props a control should spread onto its input element. */
export function useFieldControlProps() {
  const field = useContext(FieldContext)
  if (!field) return {}
  const describedBy =
    [field.hasError ? field.errorId : null, field.descriptionId].filter(Boolean).join(' ') ||
    undefined
  return {
    id: field.id,
    'aria-describedby': describedBy,
    'aria-invalid': field.hasError || undefined,
    'aria-required': field.required || undefined,
  }
}

export function Field({
  label,
  description,
  error,
  required = false,
  hint,
  children,
  className,
}: {
  label?: ReactNode
  description?: ReactNode
  error?: string | null
  required?: boolean
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  const base = useId()
  const value: FieldContextValue = {
    id: `${base}-control`,
    descriptionId: `${base}-description`,
    errorId: `${base}-error`,
    hasError: Boolean(error),
    required,
  }

  return (
    <FieldContext.Provider value={value}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label ? (
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={value.id} className="text-label text-graphite-700">
              {label}
              {required ? (
                <span className="ml-0.5 text-signal-danger-fg" aria-hidden>
                  *
                </span>
              ) : null}
            </label>
            {hint ? <span className="text-caption text-graphite-400">{hint}</span> : null}
          </div>
        ) : null}

        {children}

        {description ? (
          <p id={value.descriptionId} className="text-caption text-graphite-500">
            {description}
          </p>
        ) : null}

        {error ? (
          <p
            id={value.errorId}
            role="alert"
            className="flex items-start gap-1 text-caption text-signal-danger-fg"
          >
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}
