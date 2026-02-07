import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { customers, serviceRequests, vehicles, sites, mechanics } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import './CustomerDetailPage.css'

function buildLookups(vehicles, sites, mechanics) {
  const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const v = byId(vehicles)
  const s = byId(sites)
  const m = byId(mechanics)
  return {
    vehicle: (id) => (!id ? 'Parts sale' : v[id] ? `${v[id].make} ${v[id].model} (${v[id].license_plate})` : `#${id}`),
    site: (id) => (s[id] ? s[id].name : `#${id}`),
    mechanic: (id) => (m[id] ? m[id].name : id ? `#${id}` : '—'),
  }
}

function fmtDate(d: string | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [history, setHistory] = useState([])
  const [vehiclesList, setVehiclesList] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [mechanicsList, setMechanicsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      customers.get(id),
      serviceRequests.list({ customer_id: id ? parseInt(id, 10) : undefined }),
      vehicles.list(),
      sites.list(),
      mechanics.list(),
    ])
      .then(([c, h, v, s, m]) => {
        setCustomer(c)
        setHistory(toList(h))
        setVehiclesList(toList(v))
        setSitesList(toList(s))
        setMechanicsList(toList(m))
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  const lk = buildLookups(vehiclesList, sitesList, mechanicsList)
  const customerVehicles = (vehiclesList || []).filter((v) => String(v.customer) === String(id))

  if (error) {
    return (
      <div className="customer-detail">
        <div className="page-header">
          <Link to="/customers" className="btn btn--ghost">← Customers</Link>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

  if (loading || !customer) {
    return (
      <div className="customer-detail">
        <div className="page-header">
          <Link to="/customers" className="btn btn--ghost">← Customers</Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  return (
    <div className="customer-detail">
      <div className="page-header">
        <Link to="/customers" className="btn btn--ghost">← Customers</Link>
        <h1 className="page-title">
          {customer.first_name} {customer.last_name}
        </h1>
      </div>

      <div className="customer-detail__grid">
        <div className="card customer-detail__card">
          <h2 className="customer-detail__card-title">Contact</h2>
          <dl className="customer-detail__dl">
            <dt>Email</dt>
            <dd>{customer.email || '—'}</dd>
            <dt>Phone</dt>
            <dd>{customer.phone_number || '—'}</dd>
            <dt>Service reminders</dt>
            <dd>{customer.receive_service_reminders !== false ? 'Yes' : 'No'}</dd>
          </dl>
        </div>

        <div className="card customer-detail__card">
          <h2 className="customer-detail__card-title">Vehicles ({customerVehicles.length})</h2>
          {customerVehicles.length === 0 ? (
            <p className="customer-detail__muted">No vehicles registered.</p>
          ) : (
            <ul className="customer-detail__list">
              {customerVehicles.map((v) => (
                <li key={v.id}>
                  <Link to={`/vehicles/${v.id}`} className="customer-detail__link">
                    {v.make} {v.model} ({v.license_plate})
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card customer-detail__history-card">
        <h2 className="customer-detail__card-title">Service history</h2>
        {history.length === 0 ? (
          <p className="customer-detail__muted">No service requests yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Site</th>
                  <th>Mechanic</th>
                  <th>Service type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sr) => (
                  <tr key={sr.id}>
                    <td>{fmtDate(sr.created_at)}</td>
                    <td>{lk.vehicle(sr.vehicle)}</td>
                    <td>{lk.site(sr.site)}</td>
                    <td>{lk.mechanic(sr.assigned_mechanic)}</td>
                    <td>{sr.service_type_display || '—'}</td>
                    <td>
                      <Link to={`/service-requests/${sr.id}`} className="customer-detail__sr-link">
                        <span className={`badge badge--${(sr.status || '').toLowerCase().replace(' ', '-')}`}>
                          {sr.status}
                        </span>
                        <span className="customer-detail__sr-id"> #{sr.id}</span>
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
