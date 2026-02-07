import { useCallback, useState } from 'react'
import { invoices, reports, serviceRequests } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import { usePagination } from '../hooks/usePagination'
import { useAsyncData } from '../hooks/useAsyncData'
import Pagination from '../components/Pagination'
import PageError from '../components/PageError'
import type { Invoice, ServiceRequest } from '../types'
import Loader from '../components/Loader'
import { formatCurrency } from '../utils/currency'
import { useAuth } from '../context/AuthContext'
import './GenericListPage.css'

export default function InvoicesPage() {
  const { canWrite } = useAuth()
  const { data: rawData, loading, error, refetch } = useAsyncData(
    () => Promise.all([invoices.list(), serviceRequests.list()]),
    []
  )
  const [list, srs] = rawData
    ? [toList(rawData[0]) as Invoice[], toList(rawData[1]) as ServiceRequest[]]
    : [[], []]
  const load = useCallback(() => refetch(), [refetch])

  const [downloading, setDownloading] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null)
  const [markingError, setMarkingError] = useState<unknown>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')

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

  const byId = Object.fromEntries(srs.map((x) => [x.id, x]))
  const srLabel = (id: number) => (byId[id] ? `Service request #${id}` : `#${id}`)
  const rows = list
  const { paginatedItems, currentPage, totalPages, pageSize, setPage, setPageSize } = usePagination(rows, 10)
  const PAYMENT_LABELS = { cash: 'Cash', momo: 'MoMo', pos: 'POS' }

  return (
    <div className="generic-list">
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleExportCsv}
          disabled={exporting}
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
      {error && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <PageError error={error} onRetry={load} />
        </div>
      )}
      {!error && (
        <div className="card table-wrap">
        {markingError && (
          <div className="generic-list__error" role="alert" style={{ marginBottom: '1rem' }}>
            {apiErrorMsg(markingError)}
          </div>
        )}
        {loading ? <Loader label="Loading invoices…" /> : rows.length === 0 ? (
          <div className="empty">No invoices yet.</div>
        ) : (
          <>
            <table className="table">
            <thead>
              <tr>
                <th>Service request</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Payment method</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((r) => (
                <tr key={r.id}>
                  <td>{srLabel(r.service_request)}</td>
                  <td>{formatCurrency(r.total_cost)}</td>
                  <td>{r.paid ? 'Yes' : 'No'}</td>
                  <td>{r.paid ? ((PAYMENT_LABELS as Record<string, string>)[r.payment_method ?? ''] ?? r.payment_method ?? '—') : '—'}</td>
                  <td>
                    {!r.paid && canWrite && (
                      <span style={{ display: 'inline-flex', gap: '0.35rem', marginRight: '0.5rem' }}>
                        <select
                          className="select"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          style={{ minWidth: '100px' }}
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
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => handleDownloadPdf(r.id)}
                      disabled={downloading === r.id}
                    >
                      {downloading === r.id ? 'Downloading…' : 'PDF'}
                    </button>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={rows.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          </>
        )}
        </div>
      )}
    </div>
  )
}
