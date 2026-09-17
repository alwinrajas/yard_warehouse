'use client'

import { useQuery } from '@tanstack/react-query'

import { requestPage, request } from '@/lib/api/client'
import type { Facility, ReasonCode, Site, Zone } from '@/lib/api/types'

/**
 * Lookup lists for pickers. Cached for the session — master data changes rarely,
 * and re-fetching the facility list on every drawer open would be wasteful.
 */
const LOOKUP_STALE_MS = 5 * 60 * 1000

export function useSiteLookup(enabled = true) {
  return useQuery({
    queryKey: ['lookup', 'sites'],
    queryFn: ({ signal }) => requestPage<Site>('/api/proxy/sites?pageSize=200&status=active', { signal }),
    staleTime: LOOKUP_STALE_MS,
    enabled,
  })
}

export function useFacilityLookup(siteId?: string | null) {
  return useQuery({
    queryKey: ['lookup', 'facilities', siteId ?? 'all'],
    queryFn: ({ signal }) =>
      requestPage<Facility>(
        `/api/proxy/facilities?pageSize=200&status=active${siteId ? `&site_id=${siteId}` : ''}`,
        { signal },
      ),
    staleTime: LOOKUP_STALE_MS,
  })
}

export function useZoneLookup(facilityId?: string | null) {
  return useQuery({
    queryKey: ['lookup', 'zones', facilityId ?? 'none'],
    queryFn: ({ signal }) =>
      requestPage<Zone>(`/api/proxy/zones?pageSize=200&status=active&facility_id=${facilityId}`, { signal }),
    staleTime: LOOKUP_STALE_MS,
    // A zone list is meaningless without a facility — the zone must belong to it.
    enabled: Boolean(facilityId),
  })
}

export function useReasonCodes(category: string) {
  return useQuery({
    queryKey: ['lookup', 'reason-codes', category],
    queryFn: ({ signal }) =>
      request<ReasonCode[]>(`/api/proxy/reason-codes?category=${category}`, { signal }),
    staleTime: LOOKUP_STALE_MS,
  })
}
