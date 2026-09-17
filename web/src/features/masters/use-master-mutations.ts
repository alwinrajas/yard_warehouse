'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { request } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'

/**
 * Master-data mutations.
 *
 * Nothing renders as changed until the server confirms (UX-09); on success the
 * resource's queries are invalidated so the list reflects the committed state
 * rather than an optimistic guess.
 */
export function useMasterMutation<TVariables, TResult>(
  resource: string,
  buildRequest: (variables: TVariables) => { path: string; method: string; body?: unknown },
) {
  const queryClient = useQueryClient()

  return useMutation<TResult, ApiError, TVariables>({
    mutationFn: async (variables) => {
      const { path, method, body } = buildRequest(variables)
      return request<TResult>(path, { method, body })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [resource] })
      void queryClient.invalidateQueries({ queryKey: ['lookup'] })
    },
  })
}

/** Maps a server field-validation failure onto the form's field errors. */
export function fieldErrorsFrom(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {}
  const fields = error.details?.['fields']
  if (!fields || typeof fields !== 'object') return {}

  const mapped: Record<string, string> = {}
  for (const [key, messages] of Object.entries(fields as Record<string, string[]>)) {
    if (Array.isArray(messages) && messages[0]) mapped[key] = messages[0]
  }
  return mapped
}

/** True when the failure is a field-level validation problem rather than a rule. */
export function isFieldValidation(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'VALIDATION_FAILED'
}
