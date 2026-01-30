import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { serviceRequests, customers, vehicles, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import './ServiceRequestsPage.css'

function buildLookups(customers, vehicles, sites) {
  const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const c = byId(customers)
  const v = byId(vehicles)
  const s = byId(sites)
  return {
    customer: (id) => (c[id] ? `${c[id].first_name} ${c[id].last_name}` : `#${id}`),
    vehicle: (id) => (v[id] ? `${v[id].make} ${v[id].model} (${v[id].license_plate})` : `#${id}`),
    site: (id) => (s[id] ? s[id].name : `#${id}`),
  }
}

const STATUS_OPTIONS = ['', 'Pending', 'In Progress', 'Completed']

export default function ServiceRequestsPage() {
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const [requests, setRequests] = useState([])
  const [customersList, setCustomersList] = useState([])
  const [vehiclesList, setVehiclesList] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    Promise.all([serviceRequests.list(), customers.list(), vehicles.list(), sites.list()])
      .then(([r, c, v, s]) => {
        setRequests(toList(r))
        setCustomersList(toList(c))
        setVehiclesList(toList(v))
        setSitesList(toList(s))
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  const lk = useMemo(() => buildLookups(customersList, vehiclesList, sitesList), [customersList, vehiclesList, sitesList])
  const list = toList(requests)
  const filtered = useMemo(() => {
    if (!statusFilter) return list
    return list.filter((r) => r.status === statusFilter)
  }, [list, statusFilter])

  if (error) {
    return (
      <div className="service-requests">
        <div className="page-header">
          <h1 className="page-title">Service requests</h1>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

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
              {filtered.map((r) => (
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
                  <td>{lk.vehicle(r.vehicle)}</td>
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
        )}
      </div>
    </div>
  )
}
