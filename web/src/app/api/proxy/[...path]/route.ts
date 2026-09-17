import { NextResponse } from 'next/server'

import { apiRaw } from '@/lib/api/server'
import { AUTH_ERROR_CODES } from '@/lib/api/types'
import { getToken } from '@/lib/auth/session.server'

/**
 * Authenticated passthrough to the ALU TRACK API.
 *
 * The single place the session token is attached to an outbound request, so no
 * screen can hold a token or reach Laravel directly (docs/02 §5.2). The upstream
 * envelope and status are forwarded verbatim — including `meta.pagination`.
 *
 * This proxies; it does not authorise. Every endpoint enforces its own
 * permission server-side (docs/07 §5), so the absence of a check here is
 * deliberate rather than an omission.
 */
async function handle(request: Request, path: string[]) {
  const token = await getToken()
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: { code: AUTH_ERROR_CODES.UNAUTHENTICATED, message: 'Your session has ended.' },
      },
      { status: 401 },
    )
  }

  const url = new URL(request.url)
  const target = `/${path.join('/')}${url.search}`
  const method = request.method

  let body: unknown
  let rawBody: BodyInit | undefined
  const contentType = request.headers.get('content-type') ?? ''

  if (method !== 'GET' && method !== 'DELETE') {
    if (contentType.includes('multipart/form-data')) {
      // File uploads stream straight through; re-encoding would break the boundary.
      rawBody = await request.formData()
    } else {
      body = await request.json().catch(() => undefined)
    }
  }

  const { status, envelope, replayed } = await apiRaw(target, {
    method,
    body,
    rawBody,
    token,
    idempotencyKey: request.headers.get('Idempotency-Key') ?? undefined,
  })

  return NextResponse.json(envelope, {
    status,
    // Forwarded so the client can say "already recorded" rather than showing a
    // fresh success for a transaction that happened on the previous attempt.
    headers: replayed ? { 'Idempotency-Replayed': 'true' } : undefined,
  })
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(request: Request, ctx: Ctx) {
  return handle(request, (await ctx.params).path)
}
export async function POST(request: Request, ctx: Ctx) {
  return handle(request, (await ctx.params).path)
}
export async function PUT(request: Request, ctx: Ctx) {
  return handle(request, (await ctx.params).path)
}
export async function PATCH(request: Request, ctx: Ctx) {
  return handle(request, (await ctx.params).path)
}
export async function DELETE(request: Request, ctx: Ctx) {
  return handle(request, (await ctx.params).path)
}
