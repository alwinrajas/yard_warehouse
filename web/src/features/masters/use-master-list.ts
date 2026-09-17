'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { requestPage } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/errors'
import { DEFAULT_PAGE_SIZE } from '@/lib/app-config'
import { useUrlState } from '@/lib/url-state'

/**
 * Shared list plumbing for the master screens.
 *
 * View state lives in the URL, not in a store, so a filtered list is shareable
 * and the back button behaves (docs/22 §4 N-02). Filtering, sorting and paging
 * are all server-side — no screen fetches an unbounded set.
 */
export type MasterListFilters = Record<string, string | undefined>

export function useMasterList<T>(
  resource: string,
  options: { filterKeys: string[]; defaultSort?: string } = { filterKeys: [] },
) {
  const url = useUrlState()

  const page = url.getNumber('page', 1)
  const pageSize = url.getNumber('pageSize', DEFAULT_PAGE_SIZE)
  const search = url.get('search') ?? ''
  const sort = url.get('sort') ?? options.defaultSort ?? ''
  const dir = url.get('dir') ?? 'asc'

  const filters: MasterListFilters = {}
  for (const key of options.filterKeys) {
    const value = url.get(key)
    if (value) filters[key] = value
  }

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  if (search) params.set('search', search)
  if (sort) {
    params.set('sort', sort)
    params.set('dir', dir)
  }
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }

  const query = useQuery<{ items: T[]; pagination: { page: number; pageSize: number; total: number } }, ApiError>({
    queryKey: [resource, params.toString()],
    queryFn: ({ signal }) => requestPage<T>(`/api/proxy/${resource}?${params.toString()}`, { signal }),
    placeholderData: keepPreviousData,
  })

  return {
    ...query,
    rows: query.data?.items ?? [],
    pagination: query.data?.pagination ?? { page, pageSize, total: 0 },
    page,
    pageSize,
    search,
    sort: sort ? { key: sort, direction: dir === 'desc' ? ('desc' as const) : ('asc' as const) } : null,
    filters,
    url,
    /** True when filters are in force — distinguishes "no results" from "nothing yet" (UX-10). */
    hasFilters: Boolean(search) || Object.values(filters).some(Boolean),
  }
}
