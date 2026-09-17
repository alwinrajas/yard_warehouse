import { NextResponse } from 'next/server'

import { ApiError } from '@/lib/api/errors'
import { apiFetch } from '@/lib/api/server'
import { AUTH_ERROR_CODES, type ChangePasswordRequest } from '@/lib/api/types'
import { getToken } from '@/lib/auth/session.server'

export async function POST(request: Request) {
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

  let body: ChangePasswordRequest
  try {
    body = (await request.json()) as ChangePasswordRequest
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid request body.' } },
      { status: 422 },
    )
  }


  try {
    await apiFetch<unknown>('/auth/change-password', { method: 'POST', body, token })
    return NextResponse.json({ success: true, data: { changed: true } })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toEnvelope(), { status: error.status })
    }
    return NextResponse.json(
      { success: false, error: { code: 'UNKNOWN', message: 'Password could not be changed.' } },
      { status: 500 },
    )
  }
}
