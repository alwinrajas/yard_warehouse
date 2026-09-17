'use client'

import { ApiError } from './errors'
import type { ApiEnvelope, Paginated } from './types'

/**
 * Browser API client.
 *
 * Talks only to our own Next.js route handlers, never to Laravel. The session
 * cookie travels automatically and is httpOnly, so no token is reachable from
 * JavaScript (docs/02 §5.2).
 */
export type RequestOptions = {
  method?: string
  body?: unknown
  signal?: AbortSignal
  /** Extra headers — used to carry Idempotency-Key on transaction posts. */
  headers?: Record<string, string>
}

/** The data, plus whether the server replayed an earlier identical request. */
export type RequestResult<T> = { data: T; replayed: boolean }

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await requestDetailed<T>(path, options)).data
}

/**
 * As `request`, but reports an idempotent replay (BR-08).
 *
 * A retry after a dropped connection returns the original response, and the
 * operator must be told that rather than shown a second success for a
 * transaction that already happened.
 */
export async function requestDetailed<T>(
  path: string,
  options: RequestOptions = {},
): Promise<RequestResult<T>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      credentials: 'same-origin',
    })
  } catch {
    throw ApiError.unreachable()
  }

  let envelope: ApiEnvelope<T>
  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    throw new ApiError({
      code: 'MALFORMED_RESPONSE',
      message: 'The server returned an unreadable response.',
      status: response.status,
    })
  }

  if (!response.ok || envelope.success === false) {
    if (envelope.success === false) throw ApiError.fromEnvelope(envelope, response.status)
    throw new ApiError({
      code: 'UNKNOWN',
      message: 'The request could not be completed.',
      status: response.status,
    })
  }

  return {
    data: envelope.data,
    replayed: response.headers.get('Idempotency-Replayed') === 'true',
  }
}

/** As `request`, but also returns pagination metadata for list endpoints. */
export async function requestPage<T>(
  path: string,
  options: { signal?: AbortSignal } = {},
): Promise<Paginated<T>> {
  const response = await fetch(path, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
    credentials: 'same-origin',
  }).catch(() => {
    throw ApiError.unreachable()
  })

  const envelope = (await response.json().catch(() => {
    throw new ApiError({
      code: 'MALFORMED_RESPONSE',
      message: 'The server returned an unreadable response.',
      status: response.status,
    })
  })) as ApiEnvelope<T[]>

  if (!response.ok || envelope.success === false) {
    if (envelope.success === false) throw ApiError.fromEnvelope(envelope, response.status)
    throw new ApiError({ code: 'UNKNOWN', message: 'The request could not be completed.', status: response.status })
  }

  return {
    items: envelope.data,
    pagination: envelope.meta?.pagination ?? { page: 1, pageSize: envelope.data.length, total: envelope.data.length },
  }
}

/** Uploads a file through the proxy without re-encoding the multipart body. */
export async function upload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  }).catch(() => {
    throw ApiError.unreachable()
  })

  const envelope = (await response.json().catch(() => {
    throw new ApiError({
      code: 'MALFORMED_RESPONSE',
      message: 'The server returned an unreadable response.',
      status: response.status,
    })
  })) as ApiEnvelope<T>

  if (!response.ok || envelope.success === false) {
    if (envelope.success === false) throw ApiError.fromEnvelope(envelope, response.status)
    throw new ApiError({ code: 'UNKNOWN', message: 'The upload could not be completed.', status: response.status })
  }

  return envelope.data
}
