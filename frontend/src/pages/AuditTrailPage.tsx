import { useCallback } from 'react'
import { audit } from '../api/services'
import { useAsyncData } from '../hooks/useAsyncData'
import PageError from '../components/PageError'
import type { AuditLog } from '../types'
import Loader from '../components/Loader'
import './GenericListPage.css'

export default function AuditTrailPage() {
  const { data: list, loading, error, refetch } = useAsyncData(
    () => audit.list().then((r) => (r as { results?: AuditLog[] })?.results ?? []),
    []
  )
  const load = useCallback(() => refetch(), [refetch])

  const fmtDate = (s: string | undefined) => {
    if (!s) return '—'
    try {
      return new Date(s).toLocaleString()
    } catch {
      return s
    }
  }

  const renderChanges = (changesStr: string | undefined) => {
    try {
      const c = JSON.parse(changesStr || '{}') as Record<string, { old?: unknown; new?: unknown }>
      if (c.created) return <span className="audit-changes">Created</span>
      if (c.deleted) return <span className="audit-changes">Deleted</span>
      const entries = Object.entries(c)
      if (entries.length === 0) return null
      return (
        <ul className="audit-changes-list">
          {entries.map(([field, v]) => (
            <li key={field}>
              <strong>{field}</strong>: {String(v?.old)} → {String(v?.new)}
            </li>
          ))}
        </ul>
      )
    } catch {
      return changesStr
    }
  }

  const is403 = error && (error as { status?: number })?.status === 403

  return (
    <div className="generic-list">
      <div className="page-header">
        <h1 className="page-title">Audit trail</h1>
      </div>

      {error && (
        <div className="card" style={{ padding: '1.5rem' }}>
          {is403 ? (
            <div className="empty">You do not have permission to view the audit trail.</div>
          ) : (
            <PageError error={error} onRetry={load} />
          )}
        </div>
      )}

      {!error && (
      <div className="card table-wrap">
        {loading ? (
          <Loader label="Loading audit log…" />
        ) : list && list.length > 0 ? (
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
                  <td>{renderChanges(typeof e.changes === 'string' ? e.changes : e.changes != null ? JSON.stringify(e.changes) : undefined)}</td>
                  <td>{e.user || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No audit entries yet.</div>
        )}
      </div>
      )}
    </div>
  )
}
