'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { request, requestPage } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import { DEFAULT_PAGE_SIZE } from '@/lib/app-config'
import { useUrlState } from '@/lib/url-state'

/** Single-object GET. */
export function useApi<T>(key: unknown[], path: string, enabled = true) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: ({ signal }) => request<T>(path, { signal }),
    enabled,
  })
}

/**
 * Paginated list driven entirely by URL state, so every filtered view is
 * shareable and the back button behaves (docs/22 §4 N-02).
 */
export function useApiList<T>(
  resource: string,
  path: string,
  filterKeys: string[] = [],
  defaults: Record<string, string> = {},
) {
  const url = useUrlState()

  const page = url.getNumber('page', 1)
  const pageSize = url.getNumber('pageSize', DEFAULT_PAGE_SIZE)
  const search = url.get('search') ?? ''

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (search) params.set('search', search)

  const filters: Record<string, string> = {}
  for (const key of filterKeys) {
    const value = url.get(key) ?? defaults[key]
    if (value) {
      params.set(key, value)
      filters[key] = value
    }
  }

  const query = useQuery<{ items: T[]; pagination: { page: number; pageSize: number; total: number } }, ApiError>({
    queryKey: [resource, params.toString()],
    queryFn: ({ signal }) => requestPage<T>(`${path}?${params.toString()}`, { signal }),
    placeholderData: keepPreviousData,
  })

  return {
    ...query,
    rows: query.data?.items ?? [],
    pagination: query.data?.pagination ?? { page, pageSize, total: 0 },
    search,
    filters,
    url,
    hasFilters: Boolean(search) || Object.values(filters).some(Boolean),
    setPage: (next: number) => url.set({ page: next }, { resetPage: false }),
    setPageSize: (next: number) => url.set({ pageSize: next }),
    setSearch: (next: string) => url.set({ search: next }),
    setFilter: (key: string, value: string | null) => url.set({ [key]: value }),
    clearFilters: () => url.clear(),
  }
}

/** Mutation that invalidates the resources it affects once the server confirms. */
export function useApiMutation<TVars, TResult>(
  build: (vars: TVars) => { path: string; method?: string; body?: unknown },
  invalidate: string[] = [],
) {
  const queryClient = useQueryClient()

  return useMutation<TResult, ApiError, TVars>({
    mutationFn: (vars) => {
      const { path, method = 'POST', body } = build(vars)
      return request<TResult>(path, { method, body })
    },
    onSuccess: () => {
      for (const key of invalidate) void queryClient.invalidateQueries({ queryKey: [key] })
    },
  })
}
