import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { mechanics, serviceRequests, customers, vehicles, sites } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import './MechanicDetailPage.css'

function buildLookups(customers, vehicles, sites) {
  const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const c = byId(customers)
  const v = byId(vehicles)
  const s = byId(sites)
  return {
    customer: (id) => (c[id] ? `${c[id].first_name} ${c[id].last_name}` : `#${id}`),
    vehicle: (id) => (!id ? 'Parts sale' : v[id] ? `${v[id].make} ${v[id].model} (${v[id].license_plate})` : `#${id}`),
    site: (id) => (s[id] ? s[id].name : `#${id}`),
  }
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}

export default function MechanicDetailPage() {
  const { id } = useParams()
  const [mechanic, setMechanic] = useState(null)
  const [tasks, setTasks] = useState([])
  const [customersList, setCustomersList] = useState([])
  const [vehiclesList, setVehiclesList] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      mechanics.get(id),
      serviceRequests.list({ mechanic_id: id ? parseInt(id, 10) : undefined }),
      customers.list(),
      vehicles.list(),
      sites.list(),
    ])
      .then(([m, t, c, v, s]) => {
        setMechanic(m)
        setTasks(toList(t))
        setCustomersList(toList(c))
        setVehiclesList(toList(v))
        setSitesList(toList(s))
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  const lk = buildLookups(customersList, vehiclesList, sitesList)
  const completedCount = tasks.filter((t) => t.status === 'Completed').length
  const pendingCount = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length

  if (error) {
    return (
      <div className="mechanic-detail">
        <div className="page-header">
          <Link to="/mechanics" className="btn btn--ghost">← Mechanics</Link>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

  if (loading || !mechanic) {
    return (
      <div className="mechanic-detail">
        <div className="page-header">
          <Link to="/mechanics" className="btn btn--ghost">← Mechanics</Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  return (
    <div className="mechanic-detail">
      <div className="page-header">
        <Link to="/mechanics" className="btn btn--ghost">← Mechanics</Link>
        <h1 className="page-title">{mechanic.name}</h1>
      </div>

      <div className="mechanic-detail__grid">
        <div className="card mechanic-detail__card">
          <h2 className="mechanic-detail__card-title">Contact</h2>
          <dl className="mechanic-detail__dl">
            <dt>Phone</dt>
            <dd>{mechanic.phone_number || '—'}</dd>
            <dt>Site</dt>
            <dd>{lk.site(mechanic.site)}</dd>
          </dl>
        </div>

        <div className="card mechanic-detail__card mechanic-detail__stats">
          <h2 className="mechanic-detail__card-title">Summary</h2>
          <div className="mechanic-detail__stat-row">
            <span className="mechanic-detail__stat-label">Total assigned</span>
            <span className="mechanic-detail__stat-value">{tasks.length}</span>
          </div>
          <div className="mechanic-detail__stat-row">
            <span className="mechanic-detail__stat-label">Completed</span>
            <span className="mechanic-detail__stat-value mechanic-detail__stat-value--success">{completedCount}</span>
          </div>
          <div className="mechanic-detail__stat-row">
            <span className="mechanic-detail__stat-label">Pending / In progress</span>
            <span className="mechanic-detail__stat-value mechanic-detail__stat-value--pending">{pendingCount}</span>
          </div>
        </div>
      </div>

      <div className="card mechanic-detail__history-card">
        <h2 className="mechanic-detail__card-title">Assigned tasks & work history</h2>
        {tasks.length === 0 ? (
          <p className="mechanic-detail__muted">No tasks assigned yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Site</th>
                  <th>Service type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((sr) => (
                  <tr key={sr.id}>
                    <td>{fmtDate(sr.created_at)}</td>
                    <td>
                      <Link to={`/customers/${sr.customer}`} className="mechanic-detail__link">
                        {lk.customer(sr.customer)}
                      </Link>
                    </td>
                    <td>{lk.vehicle(sr.vehicle)}</td>
                    <td>{lk.site(sr.site)}</td>
                    <td>{sr.service_type_display || '—'}</td>
                    <td>
                      <Link to={`/service-requests/${sr.id}`} className="mechanic-detail__sr-link">
                        <span className={`badge badge--${(sr.status || '').toLowerCase().replace(' ', '-')}`}>
                          {sr.status}
                        </span>
                        <span className="mechanic-detail__sr-id"> #{sr.id}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
