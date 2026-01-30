import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { dashboard, reports } from '../api/services'
import { apiErrorMsg } from '../api/client'
import Loader from '../components/Loader'
import { formatCurrency } from '../utils/currency'
import './CEODashboard.css'

function formatTimeAgo(iso) {
  const d = new Date(iso)
  const sec = Math.floor((Date.now() - d) / 1000)
  if (sec < 60) return 'Just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return d.toLocaleDateString()
}

export default function CEODashboard() {
  const [data, setData] = useState(null)
  const [activities, setActivities] = useState([])
  const [reportsData, setReportsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(30)
  const [exporting, setExporting] = useState(null)

  const fetchActivities = useCallback(() => {
    dashboard.getActivities(25).then((r) => setActivities(Array.isArray(r?.activities) ? r.activities : [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([dashboard.get(period), reports.get(period).catch(() => null)])
      .then(([d, r]) => {
        setData(d)
        setReportsData(r)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [period])

  const handleExport = async (resource) => {
    setExporting(resource)
    try {
      await reports.exportCsv(resource)
    } catch (e) {
      console.error(apiErrorMsg(e))
    } finally {
      setExporting(null)
    }
  }

  useEffect(() => {
    fetchActivities()
    const id = setInterval(fetchActivities, 30000)
    return () => clearInterval(id)
  }, [fetchActivities])

  if (loading && !data) {
    return (
      <div className="ceo-dashboard">
        <div className="page-header">
          <h1 className="page-title">Executive Dashboard</h1>
        </div>
        <div className="card"><Loader label="Loading dashboard…" /></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ceo-dashboard">
        <div className="page-header">
          <h1 className="page-title">Executive Dashboard</h1>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

  const { summary, by_site, requests_trend, revenue_trend, low_stock_items } = data

  return (
    <div className="ceo-dashboard">
      <div className="page-header ceo-dashboard__header">
        <h1 className="page-title">Executive Dashboard</h1>
        <div className="ceo-dashboard__period">
          <label htmlFor="period">Period:</label>
          <select
            id="period"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="ceo-dashboard__select"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div className="ceo-dashboard__export">
          <span className="ceo-dashboard__export-label">Export:</span>
          {['service_requests', 'invoices', 'inventory'].map((res) => (
            <button
              key={res}
              type="button"
              className="btn btn--secondary"
              onClick={() => handleExport(res)}
              disabled={exporting === res}
            >
              {exporting === res ? '…' : res.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <section className="ceo-dashboard__summary">
        <h2 className="ceo-dashboard__section-title">Overview</h2>
        <div className="ceo-dashboard__stats">
          <div className="stat">
            <span className="stat__value">{summary.total_sites}</span>
            <span className="stat__label">Sites</span>
          </div>
          <div className="stat">
            <span className="stat__value">{summary.total_service_requests}</span>
            <span className="stat__label">Service requests</span>
          </div>
          <div className="stat stat--success">
            <span className="stat__value">{summary.completed}</span>
            <span className="stat__label">Completed</span>
          </div>
          <div className="stat stat--accent">
            <span className="stat__value">{summary.total_revenue}</span>
            <span className="stat__label">Revenue</span>
          </div>
          <div className="stat">
            <span className="stat__value">{summary.total_customers}</span>
            <span className="stat__label">Customers</span>
          </div>
          <div className="stat">
            <span className="stat__value">{summary.total_mechanics}</span>
            <span className="stat__label">Mechanics</span>
          </div>
          {summary.low_stock_count > 0 && (
            <div className="stat stat--warning">
              <span className="stat__value">{summary.low_stock_count}</span>
              <span className="stat__label">Low stock items</span>
            </div>
          )}
        </div>
      </section>

      <section className="ceo-dashboard__activities">
          <h2 className="ceo-dashboard__section-title">Live activity</h2>
          <div className="card ceo-dashboard__activity-feed">
            {activities.length === 0 ? (
              <div className="empty">No recent activity in the last 24 hours.</div>
            ) : (
              <ul className="ceo-dashboard__activity-list">
                {activities.map((a, i) => (
                  <li key={`${a.type}-${a.created_at}-${i}`} className="ceo-dashboard__activity-item">
                    <span className="ceo-dashboard__activity-time">{formatTimeAgo(a.created_at)}</span>
                    <span className="ceo-dashboard__activity-site">{a.site_name}</span>
                    <span className="ceo-dashboard__activity-desc">{a.description}</span>
                    {a.link?.type === 'service_request' && (
                      <Link to={`/service-requests/${a.link.id}`} className="ceo-dashboard__activity-link">View</Link>
                    )}
                    {a.link?.type === 'inventory' && (
                      <Link to="/inventory" className="ceo-dashboard__activity-link">View</Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

      {(requests_trend?.length > 0 || revenue_trend?.length > 0) && (
        <section className="ceo-dashboard__charts">
          {requests_trend?.length > 0 && (
            <div className="ceo-dashboard__chart card">
              <h3 className="ceo-dashboard__chart-title">Service requests over time</h3>
              <div className="ceo-dashboard__chart-inner">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={requests_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
                    <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {revenue_trend?.length > 0 && (
            <div className="ceo-dashboard__chart card">
              <h3 className="ceo-dashboard__chart-title">Revenue over time</h3>
              <div className="ceo-dashboard__chart-inner">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={revenue_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
                    <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>
      )}

      {by_site?.length > 0 && (
        <section className="ceo-dashboard__sites">
          <h2 className="ceo-dashboard__section-title">Performance by site</h2>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Location</th>
                  <th>Requests</th>
                  <th>Completed</th>
                  <th>In progress</th>
                  <th>Pending</th>
                  <th>Revenue</th>
                  <th>Mechanics</th>
                </tr>
              </thead>
              <tbody>
                {by_site.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/sites`} className="ceo-dashboard__link">{s.name}</Link></td>
                    <td>{s.location}</td>
                    <td>{s.service_requests}</td>
                    <td>{s.completed}</td>
                    <td>{s.in_progress}</td>
                    <td>{s.pending}</td>
                    <td>{formatCurrency(s.revenue)}</td>
                    <td>{s.mechanics_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {reportsData?.top_products?.length > 0 && (
        <section className="ceo-dashboard__top-products">
          <h2 className="ceo-dashboard__section-title">Top products (by usage)</h2>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity used</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.top_products.map((p) => (
                  <tr key={p.product_id}>
                    <td>{p.product_name}</td>
                    <td>{p.quantity_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {low_stock_items?.length > 0 && (
        <section className="ceo-dashboard__low-stock">
          <h2 className="ceo-dashboard__section-title">Low stock alerts</h2>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Site</th>
                  <th>On hand</th>
                  <th>Reorder level</th>
                </tr>
              </thead>
              <tbody>
                {low_stock_items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product_name}</td>
                    <td>{i.site_name}</td>
                    <td>{i.quantity_on_hand}</td>
                    <td>{i.reorder_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/inventory" className="btn btn--secondary">Manage inventory</Link>
        </section>
      )}
    </div>
  )
}
