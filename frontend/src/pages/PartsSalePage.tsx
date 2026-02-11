import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { serviceRequests, customers, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg, toList } from '../api/client'
import { buildLookups } from '../utils/lookups'
import { usePagination } from '../hooks/usePagination'
import Pagination from '../components/Pagination'
import QuickSaleModal from '../components/QuickSaleModal'
import type { Customer, Vehicle, Site, ServiceRequest } from '../types'
import Loader from '../components/Loader'
import './PartsSalePage.css'

const STATUS_OPTIONS = ['', 'Draft', 'Pending', 'In Progress', 'Completed']

export default function PartsSalePage() {
  const navigate = useNavigate()
  const { canWrite, canSeeAllSites, siteId: userSiteId } = useAuth()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [customersList, setCustomersList] = useState<Customer[]>([])
  const [walkinCustomer, setWalkinCustomer] = useState<{ id: number } | null>(null)
  const [sitesList, setSitesList] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [showQuickSale, setShowQuickSale] = useState(false)

  useEffect(() => {
    Promise.all([
      serviceRequests.list({ parts_only: true }),
      customers.list(),
      customers.walkin(),
      sites.list(),
    ])
      .then(([r, c, walkin, s]) => {
        setRequests(toList(r) as ServiceRequest[])
        setCustomersList(toList(c) as Customer[])
        setWalkinCustomer(walkin as { id: number })
        setSitesList(toList(s) as Site[])
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // Keyboard shortcut for quick sale (Ctrl+N)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n' && canWrite && walkinCustomer) {
        e.preventDefault()
        setShowQuickSale(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canWrite, walkinCustomer])

  const lk = useMemo(() => buildLookups(customersList, [] as Vehicle[], sitesList), [customersList, sitesList])
  const list = requests
  const filtered = useMemo(() => {
    if (!statusFilter) return list
    return list.filter((r) => r.status === statusFilter)
  }, [list, statusFilter])

  const { paginatedItems, currentPage, totalPages, pageSize, setPage, setPageSize } = usePagination(filtered, 10)

  if (error) {
    return (
      <div className="parts-sale">
        <div className="page-header">
          <h1 className="page-title">Sales</h1>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="parts-sale">
      <div className="page-header">
        <h1 className="page-title">Sales</h1>
        {canWrite && (
          <div className="page-header__actions">
            <button
              className="btn btn--success"
              onClick={() => setShowQuickSale(true)}
              disabled={!walkinCustomer || !userSiteId}
              title="Quick sale for walk-in customer (Ctrl+N)"
            >
              ⚡ Quick Sale
            </button>
            <Link to="/parts-sale/new" className="btn btn--primary">
              New sale
            </Link>
          </div>
        )}
      </div>

      {showQuickSale && walkinCustomer && userSiteId && (
        <QuickSaleModal
          isOpen={showQuickSale}
          onClose={() => setShowQuickSale(false)}
          walkinCustomerId={walkinCustomer.id}
          siteId={userSiteId}
        />
      )}

      <div className="parts-sale__bar">
        <label className="parts-sale__filter">
          <span className="label" style={{ marginBottom: 0, marginRight: '0.5rem' }}>Status</span>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o || 'all'} value={o}>{o || 'All'}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <Loader label="Loading sales…" />
        ) : filtered.length === 0 ? (
          <div className="empty">
            {list.length === 0 ? 'No sales yet. Use “New sale” to start one.' : 'No sales match the filter.'}
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Sale #</th>
                  <th>Customer</th>
                  {canSeeAllSites && <th>Site</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((r) => (
                  <tr
                    key={r.id}
                    data-clickable
                    onClick={() => navigate(`/service-requests/${r.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/service-requests/${r.id}`)}
                  >
                    <td>
                      <Link to={`/service-requests/${r.id}`} className="parts-sale__link" onClick={(e) => e.stopPropagation()}>
                        {(r as { display_number?: string }).display_number ?? `#${r.id}`}
                      </Link>
                    </td>
                    <td>{lk.customer(r.customer)}</td>
                    {canSeeAllSites && <td>{lk.site(r.site)}</td>}
                    <td>
                      <span className={`badge badge--${(r.status || '').toLowerCase().replace(' ', '-')}`}>
                        {r.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          </>
        )}
      </div>
    </div>
  )
}
