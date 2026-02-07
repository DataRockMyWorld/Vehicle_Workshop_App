import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboard, serviceRequests, inventory } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/currency'
import type { ServiceRequest, StockAlert } from '../types'
import Loader from '../components/Loader'
import CEODashboard from './CEODashboard'
import './DashboardPage.css'

interface SalesMetrics {
  revenue_today: string
  revenue_week: string
  revenue_prev_week: string
  sales_count_today: number
  sales_count_week: number
  sales_count_prev_week: number
  paid_today: string
  unpaid_today: string
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null
  const pct = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100
  const up = pct >= 0
  const label = `${up ? '+' : ''}${pct.toFixed(1)}%`
  return (
    <span className={`dashboard__trend dashboard__trend--${up ? 'up' : 'down'}`} title="vs last week">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        {up ? (
          <path d="M6 3v6M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M6 9V3M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      {label}
    </span>
  )
}

export default function DashboardPage() {
  const { canWrite } = useAuth()
  const [showCEODashboard, setShowCEODashboard] = useState<boolean | null>(null)
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [sales, setSales] = useState<SalesMetrics | null>(null)
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    dashboard.get(30).then(() => setShowCEODashboard(true)).catch((e: { status?: number }) => {
      if (e?.status === 403) setShowCEODashboard(false)
      else setShowCEODashboard(false)
    })
  }, [])

  const fetchDashboard = useCallback(() => {
    if (showCEODashboard !== false) return
    setLoading(true)
    Promise.all([
      serviceRequests.list(),
      dashboard.site().catch(() => null),
      inventory.lowStock().catch(() => ({ alerts: [] })),
    ])
      .then(([r, salesRes, alertsRes]) => {
        setRequests(toList(r) as ServiceRequest[])
        setSales(salesRes as SalesMetrics | null)
        const res = alertsRes as { alerts?: StockAlert[] }
        setStockAlerts(res?.alerts || [])
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [showCEODashboard])

  useEffect(() => {
    if (showCEODashboard !== false) return
    fetchDashboard()
  }, [showCEODashboard, fetchDashboard])

  // Refetch when user returns to the tab (e.g. after completing a sale in another view)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && showCEODashboard === false) {
        fetchDashboard()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [showCEODashboard, fetchDashboard])

  const list = requests
  const stats = {
    Pending: list.filter((r) => r.status === 'Pending').length,
    'In Progress': list.filter((r) => r.status === 'In Progress').length,
    Completed: list.filter((r) => r.status === 'Completed').length,
  }

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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => fetchDashboard()}
            disabled={loading}
            aria-label="Refresh dashboard"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          {canWrite && (
            <Link to="/service-requests/new" className="btn btn--primary">
              New service request
            </Link>
          )}
        </div>
      </div>

      <section className="dashboard__sales">
        <h2 className="dashboard__section-title">Sales this week</h2>
        <div className="dashboard__sales-grid">
          <div className="dashboard__sales-card dashboard__sales-card--hero">
            <div className="dashboard__sales-header">
              <span className="dashboard__sales-label">Revenue</span>
              {sales && (
                <TrendBadge
                  current={parseFloat(sales.revenue_week)}
                  previous={parseFloat(sales.revenue_prev_week)}
                />
              )}
            </div>
            <span className="dashboard__sales-value dashboard__sales-value--hero">
              {loading ? '—' : sales ? formatCurrency(parseFloat(sales.revenue_week)) : 'GH₵0.00'}
            </span>
            <span className="dashboard__sales-meta">vs last week</span>
          </div>
          <div className="dashboard__sales-card">
            <div className="dashboard__sales-header">
              <span className="dashboard__sales-label">Sales</span>
              {sales && (
                <TrendBadge
                  current={sales.sales_count_week}
                  previous={sales.sales_count_prev_week}
                />
              )}
            </div>
            <span className="dashboard__sales-value">
              {loading ? '—' : sales ? sales.sales_count_week : 0}
            </span>
            <span className="dashboard__sales-meta">completed this week</span>
          </div>
          <div className="dashboard__sales-card dashboard__sales-card--compact">
            <span className="dashboard__sales-value dashboard__sales-value--success">
              {loading ? '—' : sales ? formatCurrency(parseFloat(sales.revenue_today)) : 'GH₵0.00'}
            </span>
            <span className="dashboard__sales-label">Today</span>
          </div>
          <div className="dashboard__sales-card dashboard__sales-card--compact">
            <span className="dashboard__sales-value dashboard__sales-value--muted">
              {loading ? '—' : sales ? formatCurrency(parseFloat(sales.unpaid_today)) : 'GH₵0.00'}
            </span>
            <span className="dashboard__sales-label">Unpaid today</span>
          </div>
        </div>
      </section>

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
            <>
              <Link to="/service-requests/new" className="dashboard__action-card card">
                <span className="dashboard__action-icon">+</span>
                <span className="dashboard__action-label">New service request</span>
              </Link>
              <Link to="/parts-sale/new" className="dashboard__action-card card">
                <span className="dashboard__action-icon">+</span>
                <span className="dashboard__action-label">New parts sale</span>
              </Link>
            </>
          )}
          <Link to="/service-requests" className="dashboard__action-card card">
            <span className="dashboard__action-icon">📋</span>
            <span className="dashboard__action-label">Service requests</span>
          </Link>
          <Link to="/invoices" className="dashboard__action-card card">
            <span className="dashboard__action-icon">🧾</span>
            <span className="dashboard__action-label">Invoices</span>
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
    </div>
  )
}
