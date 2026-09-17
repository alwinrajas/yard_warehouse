import 'server-only'

import { ApiError } from './errors'
import type { ApiEnvelope } from './types'

/**
 * Server-side API client.
 *
 * Used only by the Next.js BFF route handlers and server components. The browser
 * never talks to Laravel directly: it calls our route handlers, which hold the
 * bearer token in an httpOnly cookie and attach it here (docs/02 §5.2). That
 * removes both the XSS token-theft path and cross-origin CSRF handling.
 */
const API_BASE_URL = process.env.API_BASE_URL ?? ''
const TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? 15_000)

export function isApiConfigured(): boolean {
  return API_BASE_URL.trim().length > 0
}

/**
 * Raw call that preserves the upstream envelope and status verbatim.
 *
 * The proxy uses this so `meta.pagination` survives the hop — unwrapping to
 * `data` here would silently drop paging from every list endpoint.
 */
export async function apiRaw(
  path: string,
  options: {
    method?: string
    body?: unknown
    token?: string | undefined
    idempotencyKey?: string
    contentType?: string
    rawBody?: BodyInit
  } = {},
): Promise<{ status: number; envelope: unknown; replayed: boolean }> {
  if (!isApiConfigured()) {
    return { status: 503, envelope: ApiError.unreachable().toEnvelope(), replayed: false }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      },
      body: options.rawBody ?? (options.body ? JSON.stringify(options.body) : undefined),
      signal: controller.signal,
      cache: 'no-store',
    })

    const envelope = await response.json().catch(() => ({
      success: false,
      error: { code: 'MALFORMED_RESPONSE', message: 'The server returned an unreadable response.' },
    }))

    return {
      status: response.status,
      envelope,
      // BR-08: a replay is the original response, and the caller has to be able
      // to tell the two apart — otherwise a retry reads as a second success.
      replayed: response.headers.get('Idempotency-Replayed') === 'true',
    }
  } catch {
    return { status: 503, envelope: ApiError.unreachable().toEnvelope(), replayed: false }
  } finally {
    clearTimeout(timeout)
  }
}

export async function apiFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: unknown
    token?: string | undefined
    idempotencyKey?: string
    signal?: AbortSignal
  } = {},
): Promise<T> {
  if (!isApiConfigured()) throw ApiError.unreachable()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal ?? controller.signal,
      cache: 'no-store',
    })
  } catch {
    throw ApiError.unreachable()
  } finally {
    clearTimeout(timeout)
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

  return envelope.data
}
