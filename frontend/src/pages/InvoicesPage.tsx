import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { invoices, reports, sites } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import { usePaginatedList } from '../hooks/usePaginatedList'
import Pagination from '../components/Pagination'
import PageError from '../components/PageError'
import type { Invoice } from '../types'
import Loader from '../components/Loader'
import { formatCurrency } from '../utils/currency'
import { useAuth } from '../context/AuthContext'
import './GenericListPage.css'
import './InvoicesPage.css'

const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash', momo: 'MoMo', pos: 'POS' }

export interface InvoiceWithDetails extends Invoice {
  display_number?: string
  customer_name?: string
  vehicle_display?: string
  site_name?: string
  service_request_display?: string
  created_at?: string
}

export default function InvoicesPage() {
  const { canWrite, canSeeAllSites } = useAuth()
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [siteFilter, setSiteFilter] = useState<number | ''>('')
  const [ordering, setOrdering] = useState('-created_at')
  const [sitesList, setSitesList] = useState<{ id: number; name: string }[]>([])

  const listParams = {
    paid: paidFilter === 'paid' ? 'true' : paidFilter === 'unpaid' ? 'false' : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    site_id: canSeeAllSites && siteFilter ? siteFilter : undefined,
    ordering,
  }

  const fetcher = useCallback(
    (page: number) => invoices.list({ ...listParams, page }),
    [listParams.paid, listParams.date_from, listParams.date_to, listParams.site_id, listParams.ordering]
  )

  const { items: list, count, loading, error, page, setPage, totalPages, pageSize, refetch } =
    usePaginatedList<InvoiceWithDetails>(fetcher, [
      paidFilter,
      dateFrom,
      dateTo,
      siteFilter,
      ordering,
    ])

  const load = useCallback(() => refetch(), [refetch])

  const [downloading, setDownloading] = useState<number | null>(null)
  const [downloadingReceipt, setDownloadingReceipt] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null)
  const [markingError, setMarkingError] = useState<unknown>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')

  useEffect(() => {
    if (canSeeAllSites) {
      sites.list().then((r) => setSitesList((toList(r) as { id: number; name: string }[]) || []))
    }
  }, [canSeeAllSites])

  const handleDownloadPdf = async (id: number) => {
    setDownloading(id)
    try {
      await invoices.downloadPdf(id)
    } catch (e) {
      console.error(apiErrorMsg(e))
    } finally {
      setDownloading(null)
    }
  }

  const handleDownloadReceipt = async (id: number) => {
    setDownloadingReceipt(id)
    try {
      await invoices.downloadReceipt(id)
    } catch (e) {
      console.error(apiErrorMsg(e))
    } finally {
      setDownloadingReceipt(null)
    }
  }

  const handleMarkPaid = async (inv: Invoice) => {
    if (inv.paid) return
    setMarkingPaidId(inv.id)
    setMarkingError(null)
    try {
      await invoices.update(inv.id, { paid: true, payment_method: paymentMethod })
      load()
    } catch (e) {
      setMarkingError(e)
    } finally {
      setMarkingPaidId(null)
    }
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      await reports.exportCsv('invoices')
    } catch (e) {
      console.error(apiErrorMsg(e))
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="generic-list invoices-page">
      <div className="page-header invoices-page__header">
        <h1 className="page-title">Invoices</h1>
        <div className="invoices-page__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleExportCsv}
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="invoices-page__filters card">
        <div className="invoices-page__filter-row">
          <div className="invoices-page__filter">
            <label htmlFor="paid-filter">Status</label>
            <select
              id="paid-filter"
              className="select"
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className="invoices-page__filter">
            <label htmlFor="date-from">From</label>
            <input
              id="date-from"
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="invoices-page__filter">
            <label htmlFor="date-to">To</label>
            <input
              id="date-to"
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {canSeeAllSites && sitesList.length > 0 && (
            <div className="invoices-page__filter">
              <label htmlFor="site-filter">Site</label>
              <select
                id="site-filter"
                className="select"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">All sites</option>
                {sitesList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="invoices-page__filter">
            <label htmlFor="ordering">Sort</label>
            <select
              id="ordering"
              className="select"
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
            >
              <option value="-created_at">Newest first</option>
              <option value="created_at">Oldest first</option>
              <option value="-total_cost">Highest amount</option>
              <option value="total_cost">Lowest amount</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <PageError error={error} onRetry={load} />
        </div>
      )}
      {!error && (
        <div className="card table-wrap">
          {markingError && (
            <div className="generic-list__error" role="alert">
              {apiErrorMsg(markingError)}
            </div>
          )}
          {loading ? (
            <Loader label="Loading invoices…" />
          ) : list.length === 0 ? (
            <div className="empty invoices-page__empty">
              <p>No invoices match your filters.</p>
              <p className="invoices-page__empty-hint">
                Invoices are created when a service request is marked complete.{' '}
                <Link to="/service-requests">View service requests</Link>
              </p>
            </div>
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Service request</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    {canSeeAllSites && <th>Site</th>}
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td className="invoices-page__num">{(r as InvoiceWithDetails).display_number ?? `#${r.id}`}</td>
                      <td>
                        <Link to={`/service-requests/${r.service_request}`} className="invoices-page__link">
                          {(r as InvoiceWithDetails).service_request_display ?? `#${r.service_request}`}
                        </Link>
                      </td>
                      <td>{(r as InvoiceWithDetails).customer_name ?? '—'}</td>
                      <td>{(r as InvoiceWithDetails).vehicle_display ?? '—'}</td>
                      {canSeeAllSites && <td>{(r as InvoiceWithDetails).site_name ?? '—'}</td>}
                      <td>{formatDate((r as InvoiceWithDetails).created_at)}</td>
                      <td>{formatCurrency(r.total_cost)}</td>
                      <td>
                        <span className={`badge badge--${r.paid ? 'completed' : 'pending'}`}>
                          {r.paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td>
                        {r.paid
                          ? (PAYMENT_LABELS[r.payment_method ?? ''] ?? r.payment_method ?? '—')
                          : '—'}
                      </td>
                      <td>
                        <div className="invoices-page__cell-actions">
                          {!r.paid && canWrite && (
                            <>
                              <select
                                className="select select--sm"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                aria-label="Payment method"
                              >
                                <option value="cash">Cash</option>
                                <option value="momo">MoMo</option>
                                <option value="pos">POS</option>
                              </select>
                              <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={() => handleMarkPaid(r)}
                                disabled={markingPaidId === r.id}
                              >
                                {markingPaidId === r.id ? '…' : 'Mark paid'}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => handleDownloadPdf(r.id)}
                            disabled={downloading === r.id}
                            title="Download A4 invoice"
                          >
                            {downloading === r.id ? '…' : 'PDF'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => handleDownloadReceipt(r.id)}
                            disabled={downloadingReceipt === r.id}
                            title="Download 80mm receipt"
                          >
                            {downloadingReceipt === r.id ? '…' : 'Receipt'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={count}
                pageSize={pageSize}
                onPageChange={setPage}
                pageSizeOptions={[]}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
