import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { vehicles, customers, serviceRequests, sites, mechanics } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import './VehicleDetailPage.css'

function buildLookups(customers, sites, mechanics) {
  const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const c = byId(customers)
  const s = byId(sites)
  const m = byId(mechanics)
  return {
    customer: (id) => (c[id] ? `${c[id].first_name} ${c[id].last_name}` : `#${id}`),
    site: (id) => (s[id] ? s[id].name : `#${id}`),
    mechanic: (id) => (m[id] ? m[id].name : id ? `#${id}` : '—'),
  }
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}

export default function VehicleDetailPage() {
  const { id } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [history, setHistory] = useState([])
  const [customersList, setCustomersList] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [mechanicsList, setMechanicsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      vehicles.get(id),
      serviceRequests.list({ vehicle_id: id ? parseInt(id, 10) : undefined }),
      customers.list(),
      sites.list(),
      mechanics.list(),
    ])
      .then(([v, h, c, s, m]) => {
        setVehicle(v)
        setHistory(toList(h))
        setCustomersList(toList(c))
        setSitesList(toList(s))
        setMechanicsList(toList(m))
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  const lk = buildLookups(customersList, sitesList, mechanicsList)

  if (error) {
    return (
      <div className="vehicle-detail">
        <div className="page-header">
          <Link to="/vehicles" className="btn btn--ghost">← Vehicles</Link>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

  if (loading || !vehicle) {
    return (
      <div className="vehicle-detail">
        <div className="page-header">
          <Link to="/vehicles" className="btn btn--ghost">← Vehicles</Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  return (
    <div className="vehicle-detail">
      <div className="page-header">
        <Link to="/vehicles" className="btn btn--ghost">← Vehicles</Link>
        <h1 className="page-title">
          {vehicle.make} {vehicle.model} ({vehicle.license_plate})
        </h1>
      </div>

      <div className="vehicle-detail__grid">
        <div className="card vehicle-detail__card">
          <h2 className="vehicle-detail__card-title">Details</h2>
          <dl className="vehicle-detail__dl">
            <dt>Owner</dt>
            <dd>
              <Link to={`/customers/${vehicle.customer}`} className="vehicle-detail__link">
                {lk.customer(vehicle.customer)}
              </Link>
            </dd>
            <dt>Year</dt>
            <dd>{vehicle.year || '—'}</dd>
            <dt>Site</dt>
            <dd>{lk.site(vehicle.site)}</dd>
            <dt>Last serviced</dt>
            <dd>{vehicle.last_serviced ? fmtDate(vehicle.last_serviced) : '—'}</dd>
            <dt>Service reminder</dt>
            <dd>{vehicle.service_interval_days ? `Every ${vehicle.service_interval_days} days` : '—'}</dd>
          </dl>
        </div>
      </div>

      <div className="card vehicle-detail__history-card">
        <h2 className="vehicle-detail__card-title">Service history</h2>
        {history.length === 0 ? (
          <p className="vehicle-detail__muted">No service requests yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mechanic</th>
                  <th>Service type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sr) => (
                  <tr key={sr.id}>
                    <td>{fmtDate(sr.created_at)}</td>
                    <td>{lk.mechanic(sr.assigned_mechanic)}</td>
                    <td>{sr.service_type_display || '—'}</td>
                    <td>
                      <Link to={`/service-requests/${sr.id}`} className="vehicle-detail__sr-link">
                        <span className={`badge badge--${(sr.status || '').toLowerCase().replace(' ', '-')}`}>
                          {sr.status}
                        </span>
                        <span className="vehicle-detail__sr-id"> #{sr.id}</span>
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
