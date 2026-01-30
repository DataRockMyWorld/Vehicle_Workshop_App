import { useEffect, useState } from 'react'
import { audit } from '../api/services'
import { apiErrorMsg } from '../api/client'
import Loader from '../components/Loader'
import './GenericListPage.css'

export default function AuditTrailPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    audit
      .list()
      .then((r) => setList(r.results || []))
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  const fmtDate = (s) => {
    if (!s) return '—'
    try {
      return new Date(s).toLocaleString()
    } catch {
      return s
    }
  }

  const renderChanges = (changesStr) => {
    try {
      const c = JSON.parse(changesStr || '{}')
      if (c.created) return <span className="audit-changes">Created</span>
      if (c.deleted) return <span className="audit-changes">Deleted</span>
      const entries = Object.entries(c)
      if (entries.length === 0) return null
      return (
        <ul className="audit-changes-list">
          {entries.map(([field, v]) => (
            <li key={field}>
              <strong>{field}</strong>: {String(v.old)} → {String(v.new)}
            </li>
          ))}
        </ul>
      )
    } catch {
      return changesStr
    }
  }

  if (error && error?.status === 403) {
    return (
      <div className="generic-list">
        <div className="page-header">
          <h1 className="page-title">Audit trail</h1>
        </div>
        <div className="card">
          <div className="empty">You do not have permission to view the audit trail.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="generic-list">
      <div className="page-header">
        <h1 className="page-title">Audit trail</h1>
      </div>

      {error && (
        <div className="generic-list__error" role="alert">
          {apiErrorMsg(error)}
        </div>
      )}

      <div className="card table-wrap">
        {loading ? (
          <Loader label="Loading audit log…" />
        ) : list.length === 0 ? (
          <div className="empty">No audit entries yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Model</th>
                <th>Object</th>
                <th>Changes</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.created_at)}</td>
                  <td>
                    <span className={`badge badge--${e.action}`}>{e.action}</span>
                  </td>
                  <td><code>{e.model_label}</code></td>
                  <td title={e.object_repr}>{e.object_repr?.slice(0, 40)}{e.object_repr?.length > 40 ? '…' : ''}</td>
                  <td>{renderChanges(e.changes)}</td>
                  <td>{e.user || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
