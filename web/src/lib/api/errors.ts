import { AUTH_ERROR_CODES, type ApiFailure } from './types'

/**
 * Typed API error.
 *
 * Carries the server's stable code, operator-safe message, details and trace id
 * so ExceptionPanel and the login form can render the real reason rather than a
 * generic failure (UX-07). Raw server text is never surfaced unmapped.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details: Record<string, unknown> | undefined
  readonly traceId: string | undefined

  constructor(init: {
    code: string
    message: string
    status: number
    details?: Record<string, unknown>
    traceId?: string
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.details = init.details
    this.traceId = init.traceId
  }

  static fromEnvelope(body: ApiFailure, status: number): ApiError {
    return new ApiError({
      code: body.error.code || AUTH_ERROR_CODES.UNKNOWN,
      message: body.error.message,
      status,
      details: body.error.details,
      traceId: body.error.trace_id,
    })
  }

  static unreachable(): ApiError {
    return new ApiError({
      code: AUTH_ERROR_CODES.UPSTREAM_UNAVAILABLE,
      message: 'Cannot reach the ALU TRACK server.',
      status: 503,
    })
  }

  toEnvelope(): ApiFailure {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
        ...(this.traceId ? { trace_id: this.traceId } : {}),
      },
    }
  }
}

/**
 * Login failure copy.
 *
 * An operator at the far end of a yard needs to know whether to call the
 * supervisor or move closer to an access point — "login failed" tells them
 * neither (docs/23 §2).
 */
export function loginErrorMessage(error: ApiError): { title: string; detail?: string } {
  switch (error.code) {
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
      return { title: 'Incorrect username or password.' }
    case AUTH_ERROR_CODES.ACCOUNT_INACTIVE:
      return {
        title: 'This account is inactive.',
        detail: 'Contact your ALU TRACK administrator to have it reactivated.',
      }
    case AUTH_ERROR_CODES.ACCOUNT_LOCKED: {
      const minutes = error.details?.['locked_for_minutes']
      return {
        title: 'This account is temporarily locked.',
        detail:
          typeof minutes === 'number'
            ? `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
            : 'Too many failed attempts. Try again shortly, or contact your administrator.',
      }
    }
    case AUTH_ERROR_CODES.NO_WEB_ACCESS:
      // The same code covers both directions, so the server's message — which
      // names the surface that was actually refused — is the accurate one.
      return {
        title: error.message,
        detail: 'Each account is granted the console, the PDA, or both. Ask your administrator.',
      }
    case AUTH_ERROR_CODES.RATE_LIMITED:
      return { title: 'Too many attempts.', detail: 'Wait a moment and try again.' }
    case AUTH_ERROR_CODES.UPSTREAM_UNAVAILABLE:
      return {
        title: 'Cannot reach the ALU TRACK server.',
        detail: 'Check your connection. If this continues, contact your administrator.',
      }
    default:
      return {
        title: 'Sign in could not be completed.',
        detail: error.traceId ? `Reference ${error.traceId}` : undefined,
      }
  }
}
