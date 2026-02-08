import { useState, useCallback, useEffect, useRef } from 'react'
import { toPaginated } from '../api/client'

const PAGE_SIZE = 25

export interface UsePaginatedListResult<T> {
  items: T[]
  count: number
  loading: boolean
  error: unknown
  page: number
  setPage: (p: number) => void
  totalPages: number
  pageSize: number
  refetch: () => void
}

/**
 * Fetches paginated list from API. Uses server-side pagination.
 * Refetches when page or deps change.
 * @param fetcher - (page: number) => Promise<unknown> — receives page, returns raw API response
 * @param deps - Refetch when these change (e.g. filters). Fetcher should close over filter state.
 */
export function usePaginatedList<T = unknown>(
  fetcher: (page: number) => Promise<unknown>,
  deps: readonly unknown[] = []
): UsePaginatedListResult<T> {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<T[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const mountedRef = useRef(true)

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const doFetch = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcherRef.current(page)
      .then((raw) => {
        if (!mountedRef.current) return
        const { results, count: c } = toPaginated<T>(raw)
        setItems(results)
        setCount(c)
      })
      .catch((err) => {
        if (mountedRef.current) setError(err)
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false)
      })
  }, [page])

  const refetch = useCallback(() => {
    doFetch()
  }, [doFetch])

  useEffect(() => {
    mountedRef.current = true
    doFetch()
    return () => {
      mountedRef.current = false
    }
  }, [doFetch, ...deps])

  // Reset to page 1 when filters (deps) change
  useEffect(() => {
    setPage(1)
  }, [...deps])

  return {
    items,
    count,
    loading,
    error,
    page,
    setPage,
    totalPages,
    pageSize: PAGE_SIZE,
    refetch,
  }
}
