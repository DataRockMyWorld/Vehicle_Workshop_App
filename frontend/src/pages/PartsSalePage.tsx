import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { serviceRequests, customers, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg, toList } from '../api/client'
import { buildLookups } from '../utils/lookups'
import { usePagination } from '../hooks/usePagination'
import Pagination from '../components/Pagination'
import type { Customer, Vehicle, Site, ServiceRequest } from '../types'
import Loader from '../components/Loader'
import './PartsSalePage.css'

const STATUS_OPTIONS = ['', 'Pending', 'In Progress', 'Completed']

export default function PartsSalePage() {
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [customersList, setCustomersList] = useState<Customer[]>([])
  const [sitesList, setSitesList] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    Promise.all([
      serviceRequests.list({ parts_only: true }),
      customers.list(),
      sites.list(),
    ])
      .then(([r, c, s]) => {
        setRequests(toList(r) as ServiceRequest[])
        setCustomersList(toList(c) as Customer[])
        setSitesList(toList(s) as Site[])
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

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
          <h1 className="page-title">Parts sales</h1>
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
        <h1 className="page-title">Parts sales</h1>
        {canWrite && (
          <Link to="/parts-sale/new" className="btn btn--primary">
            New sale
          </Link>
        )}
      </div>

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
          <Loader label="Loading parts sales…" />
        ) : filtered.length === 0 ? (
          <div className="empty">
            {list.length === 0 ? 'No parts sales yet. Use “New sale” to start one.' : 'No sales match the filter.'}
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Sale #</th>
                  <th>Customer</th>
                  <th>Site</th>
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
                        #{r.id}
                      </Link>
                    </td>
                    <td>{lk.customer(r.customer)}</td>
                    <td>{lk.site(r.site)}</td>
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
