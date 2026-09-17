'use client'

import { useEffect, useState } from 'react'

import { Alert, Button, Field, Modal, Select, Textarea } from '@/components/ui'
import { useReasonCodes } from '@/features/masters/use-lookups'
import { useApiMutation } from '@/features/shared/use-api'

/** Place a hold, damaged or exception flag (docs/05 §3.4). Reason is mandatory. */
export function HoldDialog({
  open,
  palletId,
  palletNumber,
  onClose,
  onDone,
}: {
  open: boolean
  palletId: string
  palletNumber: string
  onClose: () => void
  onDone?: () => void
}) {
  const reasons = useReasonCodes('HOLD')
  const [holdType, setHoldType] = useState('HOLD')
  const [reasonId, setReasonId] = useState<string | undefined>()
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setHoldType('HOLD')
      setReasonId(undefined)
      setRemarks('')
      setError(null)
    }
  }, [open])

  const place = useApiMutation<
    { pallet_id: string; hold_type: string; reason_code_id: number; remarks: string | null },
    unknown
  >((vars) => ({ path: '/api/proxy/holds', body: vars }), ['pallet', 'inventory', 'holds'])

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={`Place a hold on ${palletNumber}?`}
      description="A held pallet stays where it is and keeps its location, but cannot be dispatched until released."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={place.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={place.isPending}
            loadingLabel="Placing…"
            onClick={() => {
              setError(null)
              if (!reasonId) {
                setError('Select a reason for holding this pallet.')
                return
              }
              place.mutate(
                {
                  pallet_id: palletId,
                  hold_type: holdType,
                  reason_code_id: Number(reasonId),
                  remarks: remarks.trim() || null,
                },
                {
                  onSuccess: () => {
                    onDone?.()
                    onClose()
                  },
                  onError: (e) => setError(e.message),
                },
              )
            }}
          >
            Place hold
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="danger" title={error} live /> : null}

        <Field label="Type" required>
          <Select
            ariaLabel="Hold type"
            value={holdType}
            onValueChange={setHoldType}
            options={[
              { value: 'HOLD', label: 'Hold', description: 'Quality or commercial hold' },
              { value: 'DAMAGED', label: 'Damaged', description: 'Physically damaged' },
              { value: 'EXCEPTION', label: 'Exception', description: 'Blocks movement as well as dispatch' },
            ]}
          />
        </Field>

        <Field label="Reason" required>
          <Select
            ariaLabel="Reason"
            value={reasonId}
            onValueChange={setReasonId}
            placeholder={reasons.isLoading ? 'Loading…' : 'Select a reason'}
            options={(reasons.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
          />
        </Field>

        <Field label="Remarks" description="Recorded in the audit trail.">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} showCount />
        </Field>
      </div>
    </Modal>
  )
}
