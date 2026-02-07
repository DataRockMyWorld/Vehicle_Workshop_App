import { useCallback, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { serviceRequests, customers, vehicles, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { toList } from '../api/client'
import { buildLookups } from '../utils/lookups'
import { usePagination } from '../hooks/usePagination'
import { useAsyncData } from '../hooks/useAsyncData'
import Pagination from '../components/Pagination'
import PageError from '../components/PageError'
import type { Customer, Vehicle, Site, ServiceRequest } from '../types'
import Loader from '../components/Loader'
import './ServiceRequestsPage.css'

const STATUS_OPTIONS = ['', 'Pending', 'In Progress', 'Completed']

export default function ServiceRequestsPage() {
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const { data: rawData, loading, error, refetch } = useAsyncData(
    () => Promise.all([serviceRequests.list(), customers.list(), vehicles.list(), sites.list()]),
    []
  )
  const [requests, customersList, vehiclesList, sitesList] = rawData
    ? [
        toList(rawData[0]) as ServiceRequest[],
        toList(rawData[1]) as Customer[],
        toList(rawData[2]) as Vehicle[],
        toList(rawData[3]) as Site[],
      ]
    : [[], [], [], []]
  const load = useCallback(() => refetch(), [refetch])

  const [statusFilter, setStatusFilter] = useState('')

  const lk = useMemo(() => buildLookups(customersList, vehiclesList, sitesList), [customersList, vehiclesList, sitesList])
  const list = requests
  const filtered = useMemo(() => {
    if (!statusFilter) return list
    return list.filter((r) => r.status === statusFilter)
  }, [list, statusFilter])

  const { paginatedItems, currentPage, totalPages, pageSize, setPage, setPageSize } = usePagination(filtered, 10)

  return (
    <div className="service-requests">
      <div className="page-header">
        <h1 className="page-title">Service requests</h1>
        {canWrite && (
          <Link to="/service-requests/new" className="btn btn--primary">
            New service request
          </Link>
        )}
      </div>

      {error && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <PageError error={error} onRetry={load} />
        </div>
      )}
      {!error && (
        <>
      <div className="service-requests__bar">
        <label className="service-requests__filter">
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
          <Loader label="Loading requests…" />
        ) : filtered.length === 0 ? (
          <div className="empty">
            {list.length === 0 ? 'No service requests yet.' : 'No requests match the filter.'}
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Service type</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
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
                    <Link to={`/service-requests/${r.id}`} className="sr-link" onClick={(e) => e.stopPropagation()}>
                      #{r.id}
                    </Link>
                  </td>
                  <td>{r.service_type_display || '—'}</td>
                  <td>{lk.customer(r.customer)}</td>
                  <td>{lk.vehicle(r.vehicle ?? null)}</td>
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
        </>
      )}
    </div>
  )
}
