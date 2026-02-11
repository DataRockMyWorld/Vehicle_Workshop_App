import { describe, it, expect } from 'vitest'
import { formatCurrency } from './currency'

describe('formatCurrency', () => {
  it('formats number with GHC and commas', () => {
    expect(formatCurrency(1234.56)).toBe('GHC 1,234.56')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('GHC 0.00')
  })

  it('returns em dash for null/undefined/empty string', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
    expect(formatCurrency('')).toBe('—')
  })

  it('returns em dash for NaN', () => {
    expect(formatCurrency('invalid')).toBe('—')
  })

  it('handles string numbers', () => {
    expect(formatCurrency('1500.5')).toBe('GHC 1,500.50')
  })
})
