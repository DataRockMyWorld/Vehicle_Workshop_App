import { describe, it, expect } from 'vitest'
import { apiErrorMsg, toList, toPaginated } from './client'

describe('apiErrorMsg', () => {
  it('returns fallback for null/undefined', () => {
    expect(apiErrorMsg(null)).toBe('Something went wrong.')
    expect(apiErrorMsg(undefined)).toBe('Something went wrong.')
  })

  it('returns message for Error instance', () => {
    expect(apiErrorMsg(new Error('Validation failed'))).toBe('Validation failed')
  })

  it('returns network message for fetch errors', () => {
    expect(apiErrorMsg(new Error('Failed to fetch'))).toContain('Network error')
  })

  it('returns detail string from API error object', () => {
    expect(apiErrorMsg({ status: 400, detail: 'Invalid input' })).toBe(
      'Invalid input'
    )
  })

  it('returns first element for detail array', () => {
    expect(apiErrorMsg({ status: 400, detail: ['First error', 'Second'] })).toBe(
      'First error'
    )
  })

  it('returns status-based message for 401', () => {
    expect(apiErrorMsg({ status: 401 })).toBe(
      'Session expired. Please sign in again.'
    )
  })

  it('returns status-based message for 403', () => {
    expect(apiErrorMsg({ status: 403 })).toBe(
      "You don't have permission to do that."
    )
  })

  it('returns status-based message for 404', () => {
    expect(apiErrorMsg({ status: 404 })).toBe('Not found.')
  })
})

describe('toList', () => {
  it('returns array as-is', () => {
    const arr = [1, 2, 3]
    expect(toList(arr)).toEqual(arr)
  })

  it('extracts results from paginated response', () => {
    const results = [{ id: 1 }, { id: 2 }]
    expect(toList({ results })).toEqual(results)
  })

  it('returns empty array for null/undefined', () => {
    expect(toList(null)).toEqual([])
    expect(toList(undefined)).toEqual([])
  })

  it('returns empty array for non-array non-paginated input', () => {
    expect(toList({ foo: 'bar' })).toEqual([])
  })
})

describe('toPaginated', () => {
  it('returns results and count from paginated response', () => {
    const data = { results: [{ id: 1 }], count: 10 }
    expect(toPaginated(data)).toEqual({ results: [{ id: 1 }], count: 10 })
  })

  it('treats raw array as single page', () => {
    const arr = [1, 2, 3]
    expect(toPaginated(arr)).toEqual({ results: [1, 2, 3], count: 3 })
  })

  it('returns empty for null/undefined', () => {
    expect(toPaginated(null)).toEqual({ results: [], count: 0 })
    expect(toPaginated(undefined)).toEqual({ results: [], count: 0 })
  })
})
