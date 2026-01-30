import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { dashboard, serviceRequests, customers, vehicles, sites, inventory } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import CEODashboard from './CEODashboard'
import './DashboardPage.css'

function useLookups() {
  const [data, setData] = useState({ customers: [], vehicles: [], sites: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([customers.list(), vehicles.list(), sites.list()])
      .then(([c, v, s]) => setData({ customers: toList(c), vehicles: toList(v), sites: toList(s) }))
      .catch(() => setData({ customers: [], vehicles: [], sites: [] }))
      .finally(() => setLoading(false))
  }, [])

  return { ...data, loading }
}

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

export default function DashboardPage() {
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const [showCEODashboard, setShowCEODashboard] = useState(null) // null = checking, true = CEO, false = site user
  const [requests, setRequests] = useState([])
  const [stockAlerts, setStockAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const lookups = useLookups()

  useEffect(() => {
    dashboard.get(30).then(() => setShowCEODashboard(true)).catch((e) => {
      if (e?.status === 403) setShowCEODashboard(false)
      else setShowCEODashboard(false)
    })
  }, [])

  useEffect(() => {
    if (showCEODashboard !== false) return // Wait for CEO check; CEO view fetches its own data
    Promise.all([serviceRequests.list(), inventory.lowStock().catch(() => ({ alerts: [] }))])
      .then(([r, alertsRes]) => {
        setRequests(toList(r))
        setStockAlerts(alertsRes?.alerts || [])
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [showCEODashboard])

  const list = toList(requests)
  const stats = {
    Pending: list.filter((r) => r.status === 'Pending').length,
    'In Progress': list.filter((r) => r.status === 'In Progress').length,
    Completed: list.filter((r) => r.status === 'Completed').length,
  }
  const recent = [...list]
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .slice(0, 8)
  const lk = lookups.loading ? null : buildLookups(lookups.customers, lookups.vehicles, lookups.sites)

  if (showCEODashboard === true) {
    return <CEODashboard />
  }

  if (showCEODashboard === null) {
    return (
      <div className="dashboard">
        <div className="page-header"><h1 className="page-title">Dashboard</h1></div>
        <div className="card"><Loader label="Loading dashboard…" /></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        {canWrite && (
          <Link to="/service-requests/new" className="btn btn--primary">
            New service request
          </Link>
        )}
      </div>

      <section className="dashboard__stats">
        <div className="stat">
          <span className="stat__value">{loading ? '—' : stats.Pending}</span>
          <span className="stat__label">Pending</span>
        </div>
        <div className="stat">
          <span className="stat__value">{loading ? '—' : stats['In Progress']}</span>
          <span className="stat__label">In progress</span>
        </div>
        <div className="stat stat--success">
          <span className="stat__value">{loading ? '—' : stats.Completed}</span>
          <span className="stat__label">Completed</span>
        </div>
      </section>

      {!loading && list.length > 0 && (
        <section className="dashboard__chart">
          <h2 className="dashboard__section-title">Requests by status</h2>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Pending', count: stats.Pending }, { name: 'In progress', count: stats['In Progress'] }, { name: 'Completed', count: stats.Completed }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {stockAlerts.length > 0 && (
        <section className="dashboard__alerts">
          <h2 className="dashboard__section-title">Stock alerts</h2>
          <div className="card dashboard__alerts-card">
            <Link to="/inventory" className="dashboard__alerts-link">
              {stockAlerts.length} item{stockAlerts.length !== 1 ? 's' : ''} below reorder level →
            </Link>
            <ul className="dashboard__alerts-list">
              {stockAlerts.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <strong>{a.product_name}</strong> @ {a.site_name}: {a.quantity_on_hand} on hand (reorder at {a.reorder_level})
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="dashboard__quick-actions">
        <h2 className="dashboard__section-title">Quick actions</h2>
        <div className="dashboard__actions-grid">
          {canWrite && (
            <Link to="/service-requests/new" className="dashboard__action-card card">
              <span className="dashboard__action-icon">+</span>
              <span className="dashboard__action-label">New service request</span>
            </Link>
          )}
          <Link to="/service-requests" className="dashboard__action-card card">
            <span className="dashboard__action-icon">📋</span>
            <span className="dashboard__action-label">View all requests</span>
          </Link>
          <Link to="/customers" className="dashboard__action-card card">
            <span className="dashboard__action-icon">👤</span>
            <span className="dashboard__action-label">Customers</span>
          </Link>
          <Link to="/appointments" className="dashboard__action-card card">
            <span className="dashboard__action-icon">📅</span>
            <span className="dashboard__action-label">Appointments</span>
          </Link>
          <Link to="/inventory" className="dashboard__action-card card">
            <span className="dashboard__action-icon">📦</span>
            <span className="dashboard__action-label">Inventory</span>
          </Link>
        </div>
      </section>

      <section className="dashboard__recent">
        <h2 className="dashboard__section-title">Recent service requests</h2>
        {loading ? (
          <div className="card">
            <Loader label="Loading requests…" />
          </div>
        ) : recent.length === 0 ? (
          <div className="card">
            <div className="empty">No service requests yet. Create one to get started.</div>
          </div>
        ) : (
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Site</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr
                    key={r.id}
                    data-clickable
                    onClick={() => navigate(`/service-requests/${r.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/service-requests/${r.id}`)}
                  >
                    <td>
                      <Link to={`/service-requests/${r.id}`} className="dashboard__id" onClick={(e) => e.stopPropagation()}>
                        #{r.id}
                      </Link>
                    </td>
                    <td>{lk ? lk.customer(r.customer) : `#${r.customer}`}</td>
                    <td>{lk ? lk.vehicle(r.vehicle) : `#${r.vehicle}`}</td>
                    <td>{lk ? lk.site(r.site) : `#${r.site}`}</td>
                    <td>
                      <span className={`badge badge--${(r.status || '').toLowerCase().replace(' ', '-')}`}>
                        {r.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
