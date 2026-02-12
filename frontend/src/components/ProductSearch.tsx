import { useState, useEffect, useRef, useCallback } from 'react'
import { products } from '../api/services'
import { formatCurrency } from '../utils/currency'
import type { ProductSearchResult } from '../types'
import './ProductSearch.css'

interface ProductSearchProps {
  onSelect?: (product: ProductSearchResult | null) => void
  disabledIds?: number[]
  getAvailable?: (productId: number) => number | undefined
  placeholder?: string
  value?: string
  onChange?: (productId: string) => void
  vehicle?: string
  siteId?: number | null
  resetTrigger?: number | string
}

export default function ProductSearch({
  onSelect,
  disabledIds = [],
  getAvailable,
  placeholder = 'Search by name, SKU, FMSI, part #, brand, position, application…',
  value = '',
  onChange,
  vehicle = '',
  siteId = null,
  resetTrigger = 0,
}: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const data = await products.search(q.trim(), 15, { vehicle, siteId: siteId != null ? String(siteId) : '' })
      setResults(Array.isArray(data) ? (data as ProductSearchResult[]) : [])
      setHighlight(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [vehicle, siteId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      fetchResults(q)
      setOpen(true)
    }, 220)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, vehicle, siteId, fetchResults])

  const handleSelect = (product: ProductSearchResult) => {
    const disabled = disabledIds.includes(product.id)
    const avail = getAvailable ? getAvailable(product.id) : null
    if (disabled || (avail != null && avail < 1)) return
    setSelectedProduct(product)
    setQuery(product.name)
    setOpen(false)
    setResults([])
    onSelect?.(product)
    onChange?.(String(product.id))
  }

  const handleClear = () => {
    setQuery('')
    setSelectedProduct(null)
    setOpen(false)
    setResults([])
    onSelect?.(null)
    onChange?.('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const p = results[highlight]
      if (p) handleSelect(p)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Reset when resetTrigger changes (e.g., after adding item)
  useEffect(() => {
    if (resetTrigger) {
      setQuery('')
      setSelectedProduct(null)
      setOpen(false)
      setResults([])
    }
  }, [resetTrigger])

  return (
    <div className="product-search" ref={containerRef}>
      <div className="product-search__input-wrap">
        <input
          type="text"
          className="input product-search__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="product-search-list"
        />
        {selectedProduct && (
          <button
            type="button"
            className="product-search__clear"
            onClick={handleClear}
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
      </div>
      {loading && <div className="product-search__loading">Searching…</div>}
      {open && results.length > 0 && !loading && (
        <ul
          id="product-search-list"
          className="product-search__list"
          role="listbox"
        >
          {results.map((p, i) => {
            const disabled = disabledIds.includes(p.id)
            const avail = getAvailable ? getAvailable(p.id) : null
            const outOfStock = avail != null && avail < 1
            const itemDisabled = disabled || outOfStock
            return (
              <li
                key={p.id}
                role="option"
                aria-selected={i === highlight}
                className={`product-search__item ${i === highlight ? 'product-search__item--highlight' : ''} ${itemDisabled ? 'product-search__item--disabled' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (!itemDisabled) handleSelect(p)
                }}
              >
                <span className="product-search__item-name">{p.name}</span>
                <span className="product-search__item-meta">
                  {p.fmsi_number && <span>FMSI: {p.fmsi_number}</span>}
                  {p.product_type && <span>{p.product_type}</span>}
                  {p.position && <span>{p.position}</span>}
                  {p.application && <span title={p.application}>{(p.application || '').slice(0, 40)}{(p.application || '').length > 40 ? '…' : ''}</span>}
                  <span>{formatCurrency(p.unit_price)}</span>
                  {avail != null && (
                    <span className={outOfStock ? 'product-search__stock--low' : ''}>
                      {avail} available
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {open && !loading && results.length === 0 && (
        <div className="product-search__empty">No products found</div>
      )}
    </div>
  )
}
