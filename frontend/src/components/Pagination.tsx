import './Pagination.css'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  if (totalPages <= 1 && totalItems <= pageSize) return null

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showEllipsis = totalPages > 5
    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('ellipsis')
      const midStart = Math.max(2, currentPage - 1)
      const midEnd = Math.min(totalPages - 1, currentPage + 1)
      for (let i = midStart; i <= midEnd; i++) {
        if (!pages.includes(i)) pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis')
      if (totalPages > 1) pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <div className="pagination__info">
        <span className="pagination__range">
          Showing {start}–{end} of {totalItems}
        </span>
        {onPageSizeChange && pageSizeOptions.length > 1 && (
          <label className="pagination__size">
            <span className="pagination__size-label">Per page</span>
            <select
              className="pagination__select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="pagination__nav">
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          ←
        </button>
        <ul className="pagination__pages" role="list">
          {getPageNumbers().map((p, i) =>
            p === 'ellipsis' ? (
              <li key={`ellipsis-${i}`} className="pagination__ellipsis">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  className={`pagination__btn pagination__btn--page ${p === currentPage ? 'pagination__btn--active' : ''}`}
                  onClick={() => onPageChange(p)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  aria-label={`Page ${p}`}
                >
                  {p}
                </button>
              </li>
            )
          )}
        </ul>
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </div>
  )
}
