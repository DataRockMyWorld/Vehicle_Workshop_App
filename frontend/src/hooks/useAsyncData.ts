import { useState, useCallback, useEffect, useRef } from 'react'

export interface UseAsyncDataResult<T> {
  data: T | null
  loading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches data on mount and when deps change. Avoids setState after unmount.
 * @param fetchFn - Async function that returns data. Use useCallback if it depends on props/state.
 * @param deps - Dependencies array; refetch when these change. Pass [] for one-time fetch.
 * @param options - { initialData, enabled } - Skip fetch when enabled is false.
 */
export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  deps: readonly unknown[],
  options?: { initialData?: T | null; enabled?: boolean }
): UseAsyncDataResult<T> {
  const { initialData = null, enabled = true } = options ?? {}
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<unknown>(null)
  const mountedRef = useRef(true)
  const fetchRef = useRef(fetchFn)
  fetchRef.current = fetchFn

  const refetch = useCallback(() => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    fetchRef.current()
      .then((result) => {
        if (mountedRef.current) setData(result)
      })
      .catch((err) => {
        if (mountedRef.current) setError(err)
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false)
      })
  }, [enabled])

  useEffect(() => {
    mountedRef.current = true
    if (enabled) refetch()
    else {
      setLoading(false)
      setError(null)
    }
    return () => {
      mountedRef.current = false
    }
  }, [refetch, enabled, ...deps])

  return { data, loading, error, refetch }
}
