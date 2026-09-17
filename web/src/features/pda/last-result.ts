import type { TransactionRow } from '@/lib/api/inventory-types'

/**
 * The last confirmed transaction, so /pda/result can be reached on its own.
 *
 * Written only after the server confirms (UX-09), and only ever read back — it
 * is a receipt, never a source of truth. sessionStorage is per-tab and cleared
 * when the shift's browser session ends.
 */
const KEY = 'alutrack.pda.last-result'

export type PdaReceipt = {
  title: string
  reference: string
  details: { label: string; value: string }[]
  at: string
}

export function rememberReceipt(receipt: PdaReceipt): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(receipt))
  } catch {
    // A locked-down device without storage still completed the transaction;
    // losing the receipt copy must not surface as a failure.
  }
}

export function readReceipt(): PdaReceipt | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PdaReceipt) : null
  } catch {
    return null
  }
}

export function receiptFrom(
  title: string,
  transaction: TransactionRow,
  details: { label: string; value: string }[],
): PdaReceipt {
  return { title, reference: transaction.txn_ref, details, at: transaction.created_at ?? '' }
}
