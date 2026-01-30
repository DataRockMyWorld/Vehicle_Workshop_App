import { useEffect, useState } from 'react'
import { invoices, reports, serviceRequests } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import { formatCurrency } from '../utils/currency'
import './GenericListPage.css'

export default function InvoicesPage() {
  const [list, setList] = useState([])
  const [srs, setSrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const [exporting, setExporting] = useState(false)

  const handleDownloadPdf = async (id) => {
    setDownloading(id)
    try {
      await invoices.downloadPdf(id)
    } catch (e) {
      console.error(apiErrorMsg(e))
    } finally {
      setDownloading(null)
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

  useEffect(() => {
    Promise.all([invoices.list(), serviceRequests.list()])
      .then(([i, s]) => { setList(toList(i)); setSrs(toList(s)); })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  const byId = Object.fromEntries((toList(srs)).map((x) => [x.id, x]))
  const srLabel = (id) => (byId[id] ? `Service request #${id}` : `#${id}`)
  const rows = toList(list)

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
      {error && <div className="generic-list__error">{apiErrorMsg(error)}</div>}
      <div className="card table-wrap">
        {loading ? <Loader label="Loading invoices…" /> : rows.length === 0 ? (
          <div className="empty">No invoices yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Service request</th>
                <th>Total</th>
                <th>Paid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{srLabel(r.service_request)}</td>
                  <td>{formatCurrency(r.total_cost)}</td>
                  <td>{r.paid ? 'Yes' : 'No'}</td>
                  <td>
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
        )}
      </div>
    </div>
  )
}
