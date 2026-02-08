import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { reports, sites } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import PageError from '../components/PageError'
import { formatCurrency } from '../utils/currency'
import './SalesReportPage.css'

type Preset = '7' | '30' | '90' | 'custom'

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function SalesReportPage() {
  const { canSeeAllSites } = useAuth()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [sitesList, setSitesList] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [preset, setPreset] = useState<Preset>('30')
  const [dateFrom, setDateFrom] = useState(toYYYYMMDD(new Date(Date.now() - 30 * 86400000)))
  const [dateTo, setDateTo] = useState(toYYYYMMDD(new Date()))
  const [siteFilter, setSiteFilter] = useState<number | ''>('')
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [exporting, setExporting] = useState(false)

  const fetchReport = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: { date_from?: string; date_to?: string; period?: number; site_id?: number; group_by?: string } = {
      group_by: groupBy,
    }
    if (preset === 'custom') {
      params.date_from = dateFrom
      params.date_to = dateTo
    } else {
      params.period = parseInt(preset, 10)
    }
    if (canSeeAllSites && siteFilter) params.site_id = siteFilter
    reports
      .salesReport(params)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [preset, dateFrom, dateTo, siteFilter, groupBy, canSeeAllSites])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  useEffect(() => {
    if (canSeeAllSites) {
      sites.list().then((r) => setSitesList(toList(r) as { id: number; name: string }[]))
    }
  }, [canSeeAllSites])

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const params =
        preset === 'custom'
          ? { date_from: dateFrom, date_to: dateTo }
          : { period: parseInt(preset, 10) }
      await reports.exportCsv('invoices', params)
    } catch (e) {
      console.error(apiErrorMsg(e))
    } finally {
      setExporting(false)
    }
  }

  const meta = data?.report_metadata as Record<string, unknown> | undefined
  const summary = data?.summary as Record<string, unknown> | undefined
  const bySite = (data?.by_site as Record<string, unknown>[]) || []
  const byDateRaw = (data?.by_date as { period: string; revenue: string; sales_count: number }[]) || []
  const byDate = byDateRaw.map((d) => ({ ...d, revenue: parseFloat(d.revenue) || 0 }))
  const byPayment = (data?.by_payment_method as Record<string, unknown>[]) || []
  const transactions = (data?.transactions as Record<string, unknown>[]) || []

  return (
    <div className="sales-report">
      <div className="page-header sales-report__header">
        <h1 className="page-title">Sales Report</h1>
        <div className="sales-report__filters">
          <div className="sales-report__filter">
            <label htmlFor="preset">Period</label>
            <select
              id="preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
              className="select"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          {preset === 'custom' && (
            <>
              <div className="sales-report__filter">
                <label htmlFor="date-from">From</label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input"
                />
              </div>
              <div className="sales-report__filter">
                <label htmlFor="date-to">To</label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input"
                />
              </div>
            </>
          )}
          <div className="sales-report__filter">
            <label htmlFor="group-by">Group by</label>
            <select
              id="group-by"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
              className="select"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          {canSeeAllSites && sitesList.length > 0 && (
            <div className="sales-report__filter">
              <label htmlFor="site">Site</label>
              <select
                id="site"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value === '' ? '' : Number(e.target.value))}
                className="select"
              >
                <option value="">All sites</option>
                {sitesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="button" className="btn btn--primary" onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading…' : 'Apply'}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleExportCsv}
            disabled={exporting}
          >
            {exporting ? '…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <PageError error={error} onRetry={fetchReport} />
        </div>
      )}

      {!error && loading && !data && (
        <div className="card">
          <Loader label="Loading report…" />
        </div>
      )}

      {!error && data && (
        <>
          {meta && (
            <div className="sales-report__meta card">
              <p className="sales-report__meta-line">
                <strong>Report:</strong> Sales Report • Generated: {String(meta.generated_at || '').slice(0, 19).replace('T', ' ')} •{' '}
                {meta.date_from} to {meta.date_to} • {String(meta.scope)}
              </p>
            </div>
          )}

          {summary && (
            <section className="sales-report__summary">
              <h2 className="sales-report__section-title">Summary</h2>
              <div className="sales-report__stats">
                <div className="sales-report__stat">
                  <span className="sales-report__stat-value">{formatCurrency(summary.total_revenue)}</span>
                  <span className="sales-report__stat-label">Total revenue</span>
                </div>
                <div className="sales-report__stat">
                  <span className="sales-report__stat-value">{Number(summary.total_sales_count)}</span>
                  <span className="sales-report__stat-label">Sales count</span>
                </div>
                <div className="sales-report__stat">
                  <span className="sales-report__stat-value">{formatCurrency(summary.paid_revenue)}</span>
                  <span className="sales-report__stat-label">Paid</span>
                </div>
                <div className="sales-report__stat">
                  <span className="sales-report__stat-value">{formatCurrency(summary.unpaid_revenue)}</span>
                  <span className="sales-report__stat-label">Unpaid</span>
                </div>
                <div className="sales-report__stat">
                  <span className="sales-report__stat-value">{formatCurrency(summary.average_ticket)}</span>
                  <span className="sales-report__stat-label">Avg. ticket</span>
                </div>
              </div>
            </section>
          )}

          {byDate.length > 0 && (
            <section className="sales-report__chart card">
              <h2 className="sales-report__section-title">Revenue by period</h2>
              <div className="sales-report__chart-inner">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                      formatter={(v: number | string) => [formatCurrency(Number(v)), 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {bySite.length > 0 && (
            <section className="sales-report__section">
              <h2 className="sales-report__section-title">By site</h2>
              <div className="card table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th className="table__num">Revenue</th>
                      <th className="table__num">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySite.map((s, i) => (
                      <tr key={s.site_id ?? i}>
                        <td>{s.site_name}</td>
                        <td className="table__num">{formatCurrency(s.revenue)}</td>
                        <td className="table__num">{s.sales_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {byPayment.length > 0 && (
            <section className="sales-report__section">
              <h2 className="sales-report__section-title">By payment method</h2>
              <div className="card table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th className="table__num">Revenue</th>
                      <th className="table__num">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPayment.map((p, i) => (
                      <tr key={p.payment_method ?? i}>
                        <td>{String(p.payment_method_label ?? p.payment_method ?? '—')}</td>
                        <td className="table__num">{formatCurrency(p.revenue)}</td>
                        <td className="table__num">{p.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {transactions.length > 0 && (
            <section className="sales-report__section">
              <h2 className="sales-report__section-title">Transactions (audit trail)</h2>
              <div className="card table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>SR#</th>
                      <th>Site</th>
                      <th className="table__num">Total</th>
                      <th>Paid</th>
                      <th>Method</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={t.invoice_id ?? i}>
                        <td>
                          <Link to={`/service-requests/${t.service_request_id}`} className="sales-report__link">
                            #{t.invoice_id}
                          </Link>
                        </td>
                        <td>{t.service_request_id}</td>
                        <td>{t.site_name}</td>
                        <td className="table__num">{formatCurrency(t.total_cost)}</td>
                        <td>{t.paid ? 'Yes' : 'No'}</td>
                        <td>{t.payment_method || '—'}</td>
                        <td>{String(t.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!loading && bySite.length === 0 && transactions.length === 0 && (
            <div className="card">
              <div className="empty">No sales data for the selected period.</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
