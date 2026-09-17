'use client'

import { useEffect, useState } from 'react'

import { Alert, Field, Modal, Select, Textarea, Button } from '@/components/ui'
import { useReasonCodes } from '@/features/masters/use-lookups'
import { useMasterMutation } from '@/features/masters/use-master-mutations'
import type { LocationRecord } from '@/lib/api/types'

/**
 * Blocking requires a reason so the occupancy board can say why a lane is
 * refusing inbound (docs/05 §3.4). Blocking is operational and reversible;
 * deactivating is a master-data change — the two are deliberately separate.
 */
export function BlockLocationDialog({
  location,
  onClose,
}: {
  location: LocationRecord | null
  onClose: () => void
}) {
  const reasons = useReasonCodes('LOCATION_BLOCK')
  const [reasonId, setReasonId] = useState<string | undefined>(undefined)
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (location) {
      setReasonId(undefined)
      setRemarks('')
      setError(null)
    }
  }, [location])

  const block = useMasterMutation<{ id: string; reasonId: string; remarks: string }, LocationRecord>(
    'locations',
    ({ id, reasonId: reason, remarks: note }) => ({
      path: `/api/proxy/locations/${id}/block`,
      method: 'POST',
      body: { reason_code_id: Number(reason), remarks: note.trim() || null },
    }),
  )

  const selected = reasons.data?.find((reason) => reason.id === reasonId)

  return (
    <Modal
      open={location !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`Block ${location?.code ?? ''}?`}
      description="New put-away and transfers into this location will be refused. Stock already recorded there is unaffected."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={block.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={block.isPending}
            loadingLabel="Blocking…"
            onClick={() => {
              setError(null)
              if (!location || !reasonId) {
                setError('Select a reason for blocking this location.')
                return
              }
              block.mutate(
                { id: location.id, reasonId, remarks },
                {
                  onSuccess: onClose,
                  onError: (caught) => setError(caught.message),
                },
              )
            }}
          >
            Block location
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="danger" title={error} live /> : null}

        <Field label="Reason" required>
          <Select
            ariaLabel="Block reason"
            value={reasonId}
            onValueChange={setReasonId}
            placeholder={reasons.isLoading ? 'Loading reasons…' : 'Select a reason'}
            options={(reasons.data ?? []).map((reason) => ({ value: reason.id, label: reason.name }))}
          />
        </Field>

        <Field
          label="Remarks"
          required={selected?.requires_remarks}
          description={selected?.requires_remarks ? 'This reason requires remarks.' : 'Optional context for the audit trail.'}
        >
          <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} maxLength={500} showCount />
        </Field>
      </div>
    </Modal>
  )
}
