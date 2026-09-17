import { afterEach, describe, expect, it, vi } from 'vitest'

import { request, requestDetailed } from './client'

/**
 * BR-08 — a retry must be distinguishable from a new transaction.
 *
 * When a connection drops after the server committed, the PDA retries with the
 * same key and gets the original response back. If the UI cannot tell that
 * apart from a fresh commit, it tells the operator a second pallet movement
 * happened. It did not.
 */
function respond(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('idempotent replay', () => {
  it('reports a replay when the server marks one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respond({ success: true, data: { txn_ref: 'PA-20260101-000001' } }, { 'Idempotency-Replayed': 'true' }),
      ),
    )

    const result = await requestDetailed<{ txn_ref: string }>('/api/proxy/putaway', {
      method: 'POST',
      body: {},
      headers: { 'Idempotency-Key': 'k1' },
    })

    expect(result.replayed).toBe(true)
    expect(result.data.txn_ref).toBe('PA-20260101-000001')
  })

  it('reports a first commit as not replayed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respond({ success: true, data: { txn_ref: 'PA-20260101-000002' } })),
    )

    const result = await requestDetailed<{ txn_ref: string }>('/api/proxy/putaway', {
      method: 'POST',
      body: {},
      headers: { 'Idempotency-Key': 'k2' },
    })

    expect(result.replayed).toBe(false)
  })

  it('leaves request() returning the payload unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respond({ success: true, data: { txn_ref: 'PA-20260101-000003' } })),
    )

    await expect(request<{ txn_ref: string }>('/api/proxy/putaway', { method: 'POST' })).resolves.toEqual({
      txn_ref: 'PA-20260101-000003',
    })
  })

  it('sends the idempotency key the caller supplied', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      respond({ success: true, data: {} }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await request('/api/proxy/dispatch', {
      method: 'POST',
      body: { pallet_barcode: 'PAL-1' },
      headers: { 'Idempotency-Key': 'retry-me' },
    })

    const init = fetchMock.mock.calls[0]?.[1]
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBe('retry-me')
  })
})
