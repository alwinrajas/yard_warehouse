'use client'

/**
 * View state lives in the URL, never in a client store (docs/26 §3).
 *
 * A filtered, sorted, paginated view is therefore shareable, survives refresh and
 * behaves correctly with browser back — which is rule N-02 in docs/22 §4.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

export type UrlStateValue = string | number | boolean | null | undefined

export function useUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const get = useCallback((key: string) => searchParams.get(key), [searchParams])

  const getAll = useCallback((key: string) => searchParams.getAll(key), [searchParams])

  const getNumber = useCallback(
    (key: string, fallback: number) => {
      const raw = searchParams.get(key)
      if (raw === null) return fallback
      const n = Number(raw)
      return Number.isFinite(n) ? n : fallback
    },
    [searchParams],
  )

  /** Apply a patch of keys. `null`/`undefined`/`''` removes the key. */
  const set = useCallback(
    (patch: Record<string, UrlStateValue>, options?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === '') next.delete(key)
        else next.set(key, String(value))
      }
      if (options?.resetPage !== false) next.delete('page')
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const clear = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams()
      for (const key of keep) {
        const value = searchParams.get(key)
        if (value !== null) next.set(key, value)
      }
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const activeCount = useMemo(() => {
    let count = 0
    searchParams.forEach((_value, key) => {
      if (key !== 'page' && key !== 'pageSize' && key !== 'sort' && key !== 'dir') count += 1
    })
    return count
  }, [searchParams])

  return { get, getAll, getNumber, set, clear, activeCount, searchParams }
}
