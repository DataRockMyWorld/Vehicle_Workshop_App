import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePaginatedList } from './usePaginatedList'

describe('usePaginatedList', () => {
  it('fetches and returns items on mount', async () => {
    const fetcher = vi.fn().mockResolvedValue({ results: [{ id: 1, name: 'A' }], count: 1 })
    const { result } = renderHook(() => usePaginatedList(fetcher, []))

    expect(result.current.loading).toBe(true)
    expect(fetcher).toHaveBeenCalledWith(1)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.items).toEqual([{ id: 1, name: 'A' }])
    expect(result.current.count).toBe(1)
    expect(result.current.totalPages).toBe(1)
  })

  it('refetches when page changes', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ results: [{ id: 1 }], count: 50 })
      .mockResolvedValueOnce({ results: [{ id: 26 }], count: 50 })
    const { result } = renderHook(() => usePaginatedList(fetcher, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    result.current.setPage(2)

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith(2)
    })
  })

  it('handles fetch error', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => usePaginatedList(fetcher, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toEqual(new Error('Network error'))
    expect(result.current.items).toEqual([])
  })
})
