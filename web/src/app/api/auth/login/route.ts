import { NextResponse } from 'next/server'

import { ApiError } from '@/lib/api/errors'
import { apiFetch, isApiConfigured } from '@/lib/api/server'
import { LOGIN_CHANNELS, type LoginRequest, type LoginResponse } from '@/lib/api/types'
import { persistSession } from '@/lib/auth/session.server'

/**
 * BFF login (docs/02 §5.2).
 *
 * The browser posts credentials here; this handler calls Laravel, receives the
 * token, and stores it in an httpOnly cookie. The token never reaches
 * client-side JavaScript.
 *
 * The channel is forwarded but not trusted: Laravel decides whether the account
 * may use that surface, and the channel only ever narrows what a session can do.
 */
export async function POST(request: Request) {
  let body: LoginRequest
  try {
    body = (await request.json()) as LoginRequest
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid request body.' } },
      { status: 422 },
    )
  }

  if (!body.username?.trim() || !body.password) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Username and password are required.' },
      },
      { status: 422 },
    )
  }

  const channel = LOGIN_CHANNELS.includes(body.channel as never) ? body.channel : 'WEB'

  try {
    const login = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { username: body.username.trim(), password: body.password, channel },
    })

    const session = await persistSession(login, channel)
    return NextResponse.json({
      success: true,
      data: { session, mustChangePassword: login.user.must_change_password },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toEnvelope(), { status: error.status })
    }
    if (!isApiConfigured()) {
      return NextResponse.json(ApiError.unreachable().toEnvelope(), { status: 503 })
    }
    return NextResponse.json(
      { success: false, error: { code: 'UNKNOWN', message: 'Sign in could not be completed.' } },
      { status: 500 },
    )
  }
}
