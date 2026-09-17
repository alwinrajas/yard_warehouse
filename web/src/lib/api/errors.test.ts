import { describe, expect, it } from 'vitest'

import { ApiError, loginErrorMessage } from './errors'
import { AUTH_ERROR_CODES } from './types'

describe('ApiError', () => {
  it('round-trips through the documented envelope', () => {
    const error = ApiError.fromEnvelope(
      {
        success: false,
        error: {
          code: 'PALLET_ALREADY_STORED',
          message: 'Pallet is already stored.',
          details: { location_code: 'A-02-14' },
          trace_id: '01J8X',
        },
      },
      409,
    )

    expect(error.code).toBe('PALLET_ALREADY_STORED')
    expect(error.status).toBe(409)
    expect(error.details).toEqual({ location_code: 'A-02-14' })
    expect(error.toEnvelope()).toEqual({
      success: false,
      error: {
        code: 'PALLET_ALREADY_STORED',
        message: 'Pallet is already stored.',
        details: { location_code: 'A-02-14' },
        trace_id: '01J8X',
      },
    })
  })

  it('represents an unreachable server distinctly from a rejection', () => {
    expect(ApiError.unreachable().code).toBe(AUTH_ERROR_CODES.UPSTREAM_UNAVAILABLE)
    expect(ApiError.unreachable().status).toBe(503)
  })
})

describe('loginErrorMessage', () => {
  it('distinguishes every failure an operator can act on differently', () => {
    const codes = [
      AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
      AUTH_ERROR_CODES.ACCOUNT_LOCKED,
      AUTH_ERROR_CODES.NO_WEB_ACCESS,
      AUTH_ERROR_CODES.UPSTREAM_UNAVAILABLE,
    ]
    const titles = codes.map(
      (code) => loginErrorMessage(new ApiError({ code, message: '', status: 401 })).title,
    )
    // A generic "login failed" for all five is the failure mode this guards against:
    // it leaves an operator unable to tell whether to call support or move closer
    // to an access point.
    expect(new Set(titles).size).toBe(codes.length)
  })

  it('reports the remaining lockout time when the server supplies it', () => {
    const message = loginErrorMessage(
      new ApiError({
        code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
        message: '',
        status: 423,
        details: { locked_for_minutes: 15 },
      }),
    )
    expect(message.detail).toContain('15 minutes')
  })

  it('singularises one minute', () => {
    const message = loginErrorMessage(
      new ApiError({
        code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
        message: '',
        status: 423,
        details: { locked_for_minutes: 1 },
      }),
    )
    expect(message.detail).toContain('1 minute.')
  })

  it('surfaces a trace id for unmapped failures so support has something to go on', () => {
    const message = loginErrorMessage(
      new ApiError({ code: 'WEIRD', message: 'x', status: 500, traceId: '01J8XQ' }),
    )
    expect(message.detail).toContain('01J8XQ')
  })

  it('never leaks a raw server message for a known code', () => {
    const message = loginErrorMessage(
      new ApiError({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'SQLSTATE[42S02] users table missing',
        status: 401,
      }),
    )
    expect(message.title).not.toContain('SQLSTATE')
  })
})
