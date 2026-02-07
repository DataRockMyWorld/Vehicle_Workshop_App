import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { search } from '../api/services'
import type { SearchResponse, SearchResultItem } from '../types'
import './SearchBar.css'

export default function SearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    try {
      const data = await search(q, 8)
      setResults(data as SearchResponse)
      setOpen(true)
    } catch {
      setResults({ service_requests: [], customers: [], vehicles: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, doSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleSelect = (item: SearchResultItem & { section?: string }) => {
    setOpen(false)
    setQuery('')
    if (item.url) navigate(item.url)
  }

  const allResults: (SearchResultItem & { section: string })[] = results
    ? [
        ...(results.service_requests || []).map((r) => ({ ...r, section: 'Service requests' })),
        ...(results.customers || []).map((r) => ({ ...r, section: 'Customers' })),
        ...(results.vehicles || []).map((r) => ({ ...r, section: 'Vehicles' })),
      ]
    : []
  const hasResults = allResults.length > 0
  const showDropdown = open && (query.length >= 2) && !loading

  return (
    <div className="search-bar" ref={containerRef}>
      <div className="search-bar__input-wrap">
        <span className="search-bar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          type="search"
          className="search-bar__input"
          placeholder="Search requests, customers, vehicles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          aria-label="Search"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {loading && (
          <span className="search-bar__spinner" aria-hidden="true">
            <span className="search-bar__spinner-dot" />
          </span>
        )}
      </div>
      {showDropdown && (
        <div className="search-bar__dropdown" role="listbox">
          {hasResults ? (
            <ul className="search-bar__list">
              {allResults.slice(0, 12).map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    className="search-bar__item"
                    onClick={() => handleSelect(item)}
                    role="option"
                  >
                    <span className="search-bar__item-section">{item.section}</span>
                    <span className="search-bar__item-title">{item.title}</span>
                    {item.subtitle && (
                      <span className="search-bar__item-sub">{item.subtitle}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="search-bar__empty">No results found</div>
          )}
        </div>
      )}
    </div>
  )
}
