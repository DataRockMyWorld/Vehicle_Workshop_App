import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { dashboard, serviceRequests, inventory } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/currency'
import type { ServiceRequest, StockAlert } from '../types'
import Loader from '../components/Loader'
import CEODashboard from './CEODashboard'
import './DashboardPage.css'

const CHART_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#22c55e', '#3b82f6', '#ec4899', '#64748b']

function ChartLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="dashboard__chart-legend">
      {items.map((item, i) => (
        <li key={i} className="dashboard__chart-legend-item">
          <span className="dashboard__chart-legend-dot" style={{ backgroundColor: item.color }} aria-hidden />
          <span className="dashboard__chart-legend-label">{item.name}</span>
        </li>
      ))}
    </ul>
  )
}

interface SalesMetrics {
  revenue_today: string
  revenue_week: string
  revenue_prev_week: string
  sales_count_today: number
  sales_count_week: number
  sales_count_prev_week: number
  paid_today: string
  unpaid_today: string
  top_products?: { product_id: number; product_name: string; quantity_sold: number }[]
  by_service_category?: { category: string; count: number }[]
  by_payment_method?: { method: string; label: string; revenue: string }[]
  revenue_mix?: { type: string; label: string; value: string }[]
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
              {loading ? '—' : sales ? formatCurrency(parseFloat(sales.revenue_week)) : 'GHC 0.00'}
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
              {loading ? '—' : sales ? formatCurrency(parseFloat(sales.revenue_today)) : 'GHC 0.00'}
            </span>
            <span className="dashboard__sales-label">Today</span>
          </div>
          <div className="dashboard__sales-card dashboard__sales-card--compact">
            <span className="dashboard__sales-value dashboard__sales-value--muted">
              {loading ? '—' : sales ? formatCurrency(parseFloat(sales.unpaid_today)) : 'GHC 0.00'}
            </span>
            <span className="dashboard__sales-label">Unpaid today</span>
          </div>
        </div>
      </section>

      {sales && (sales.top_products?.length || sales.by_service_category?.length || sales.by_payment_method?.length || sales.revenue_mix?.length) ? (
        <section className="dashboard__infographics">
          <h2 className="dashboard__section-title">Insights (last 30 days)</h2>
          <div className="dashboard__charts-grid">
            {sales.by_payment_method && sales.by_payment_method.length > 0 && (
              <div className="dashboard__chart-card dashboard__chart-card--pie card">
                <div className="dashboard__chart-card-inner">
                  <h3 className="dashboard__chart-title">Revenue by payment method</h3>
                  <div className="dashboard__chart-body">
                    <div className="dashboard__chart-wrap dashboard__chart-wrap--donut">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                            data={sales.by_payment_method.map((p, i) => ({
                              name: p.label,
                              value: parseFloat(p.revenue),
                              fill: CHART_COLORS[i % CHART_COLORS.length],
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={72}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {sales.by_payment_method.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => formatCurrency(v)}
                            contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ChartLegend
                      items={sales.by_payment_method.map((p, i) => ({
                        name: p.label,
                        color: CHART_COLORS[i % CHART_COLORS.length],
                      }))}
                    />
                  </div>
                </div>
              </div>
            )}
            {sales.by_service_category && sales.by_service_category.length > 0 && (
              <div className="dashboard__chart-card dashboard__chart-card--pie card">
                <div className="dashboard__chart-card-inner">
                  <h3 className="dashboard__chart-title">Services by category</h3>
                  <div className="dashboard__chart-body">
                    <div className="dashboard__chart-wrap dashboard__chart-wrap--pie">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                            data={sales.by_service_category.map((c, i) => ({
                              name: c.category,
                              value: c.count,
                              fill: CHART_COLORS[i % CHART_COLORS.length],
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={72}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {sales.by_service_category.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                            formatter={(v: number) => `${v} jobs`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ChartLegend
                      items={sales.by_service_category.map((c, i) => ({
                        name: c.category,
                        color: CHART_COLORS[i % CHART_COLORS.length],
                      }))}
                    />
                  </div>
                </div>
              </div>
            )}
            {sales.revenue_mix && sales.revenue_mix.some((r) => parseFloat(r.value) > 0) && (
              <div className="dashboard__chart-card dashboard__chart-card--pie card">
                <div className="dashboard__chart-card-inner">
                  <h3 className="dashboard__chart-title">Revenue mix</h3>
                  <div className="dashboard__chart-body">
                    <div className="dashboard__chart-wrap dashboard__chart-wrap--donut">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                            data={sales.revenue_mix
                              .filter((r) => parseFloat(r.value) > 0)
                              .map((r, i) => ({
                                name: r.label,
                                value: parseFloat(r.value),
                                fill: CHART_COLORS[i % CHART_COLORS.length],
                              }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={72}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {sales.revenue_mix
                              .filter((r) => parseFloat(r.value) > 0)
                              .map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => formatCurrency(v)}
                            contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ChartLegend
                      items={sales.revenue_mix
                        .filter((r) => parseFloat(r.value) > 0)
                        .map((r, i) => ({
                          name: r.label,
                          color: CHART_COLORS[i % CHART_COLORS.length],
                        }))}
                    />
                  </div>
                </div>
              </div>
            )}
            {sales.top_products && sales.top_products.length > 0 && (
              <div className="dashboard__chart-card dashboard__chart-card--wide card">
                <div className="dashboard__chart-card-inner">
                  <h3 className="dashboard__chart-title">Top products sold</h3>
                  <div className="dashboard__chart-wrap dashboard__chart-wrap--bar">
                  <ResponsiveContainer width="100%" height={Math.max(200, sales.top_products.length * 36)}>
                    <BarChart
                      data={sales.top_products.map((p) => ({
                        name: p.product_name.length > 25 ? p.product_name.slice(0, 24) + '…' : p.product_name,
                        qty: p.quantity_sold,
                        fullName: p.product_name,
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        formatter={(v: number, _n: string, props: { payload?: { fullName?: string } }) => [
                          `${v} sold`,
                          props.payload?.fullName,
                        ]}
                      />
                      <Bar dataKey="qty" fill="var(--accent)" radius={[0, 4, 4, 0]} name="Qty sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

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
                <span className="dashboard__action-label">New sale</span>
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
