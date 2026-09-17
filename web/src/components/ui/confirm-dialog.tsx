'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Button } from './button'
import { Field } from './field'
import { Input } from './input'
import { Modal } from './modal'

/**
 * Confirmation. Friction is proportional to consequence, and only to consequence
 * (docs/25 §6).
 *
 *   tier 2 — dialog naming the specific record and what will happen
 *   tier 3 — additionally requires typing the record identifier
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  /** Tier 3: the user must type this exact value to enable the confirm button. */
  typeToConfirm,
  typeToConfirmLabel,
  loading,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  typeToConfirm?: string
  typeToConfirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  children?: ReactNode
}) {
  const [typed, setTyped] = useState('')
  const satisfied = !typeToConfirm || typed.trim() === typeToConfirm

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped('')
        onOpenChange(next)
      }}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={!satisfied}
            loading={loading}
            loadingLabel="Working…"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {typeToConfirm ? (
        <div className={cn(children ? 'mt-4' : '')}>
          <Field
            label={typeToConfirmLabel ?? 'Type the identifier to confirm'}
            description={
              <>
                Enter <span className="font-mono text-mono text-graphite-700">{typeToConfirm}</span>{' '}
                to continue.
              </>
            }
          >
            <Input
              mono
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
              placeholder={typeToConfirm}
            />
          </Field>
        </div>
      ) : null}
    </Modal>
  )
}
