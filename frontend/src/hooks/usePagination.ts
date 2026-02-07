import { useState, useMemo, useEffect } from 'react'

export function usePagination<T>(items: T[], defaultPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  // Reset to page 1 when items length shrinks and current page would be out of range
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1)
    }
  }, [page, totalPages])

  return {
    paginatedItems,
    currentPage,
    totalPages,
    pageSize,
    setPage,
    setPageSize,
  }
}
