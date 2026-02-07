import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAsyncData } from './useAsyncData'

describe('useAsyncData', () => {
  it('starts in loading state', () => {
    const fn = vi.fn().mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAsyncData(fn, []))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('sets data and clears loading on success', async () => {
    const data = { id: 1, name: 'test' }
    const fn = vi.fn().mockResolvedValue(data)
    const { result } = renderHook(() => useAsyncData(fn, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(data)
    expect(result.current.error).toBeNull()
  })

  it('sets error and clears loading on failure', async () => {
    const err = new Error('fetch failed')
    const fn = vi.fn().mockRejectedValue(err)
    const { result } = renderHook(() => useAsyncData(fn, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe(err)
  })

  it('refetch clears error and fetches again', async () => {
    const err = new Error('first failed')
    const data = { ok: true }
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce(data)

    const { result } = renderHook(() => useAsyncData(fn, []))

    await waitFor(() => {
      expect(result.current.error).toBe(err)
    })

    result.current.refetch()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.data).toEqual(data)
    })

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not fetch when enabled is false', () => {
    const fn = vi.fn().mockResolvedValue({})
    renderHook(() => useAsyncData(fn, [], { enabled: false }))

    expect(fn).not.toHaveBeenCalled()
  })

  it('uses initialData when provided', () => {
    const initial = { cached: true }
    const fn = vi.fn().mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() =>
      useAsyncData(fn, [], { initialData: initial })
    )

    expect(result.current.data).toEqual(initial)
  })
})
