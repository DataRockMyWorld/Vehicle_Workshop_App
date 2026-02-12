import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mechanics, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import UnsavedChangesModal from '../components/UnsavedChangesModal'
import { apiErrorMsg, toList } from '../api/client'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useAsyncData } from '../hooks/useAsyncData'
import Pagination from '../components/Pagination'
import PageError from '../components/PageError'
import './GenericListPage.css'

export default function MechanicsPage() {
  const { canWrite, canSeeAllSites, siteId: userSiteId } = useAuth()
  const { items: list, count, loading, error, page, setPage, totalPages, pageSize, refetch } = usePaginatedList(
    (p) => mechanics.list(p),
    []
  )
  const { data: sitesRaw } = useAsyncData(() => sites.list(), [])
  const sitesList = toList(sitesRaw ?? null)
  const load = useCallback(() => refetch(), [refetch])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone_number, setPhone_number] = useState('')
  const [site, setSite] = useState(userSiteId ? String(userSiteId) : '')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { showWarning, confirmNavigation, cancelNavigation } = useUnsavedChanges(hasUnsavedChanges)

  useEffect(() => {
    if (userSiteId) setSite(String(userSiteId))
  }, [userSiteId])

  const effectiveSite = canSeeAllSites ? (site ? parseInt(site, 10) : null) : userSiteId
  const byId = (arr, id) => (arr || []).find((x) => x.id === parseInt(id, 10))
  const siteName = (id) => {
    const s = byId(sitesList, id)
    return s ? s.name : `#${id}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (!effectiveSite) {
      setFormError(canSeeAllSites ? 'Please select a site.' : 'No site assigned. Contact your administrator.')
      return
    }
    setSubmitting(true)
    try {
      await mechanics.create({
        name: name.trim(),
        phone_number: phone_number.trim() || '',
        site: effectiveSite,
      })
      setName('')
      setPhone_number('')
      setSite(userSiteId ? String(userSiteId) : '')
      setHasUnsavedChanges(false)
      setShowForm(false)
      load()
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="generic-list">
      <UnsavedChangesModal
        isOpen={showWarning}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
      <div className="page-header">
        <h1 className="page-title">Mechanics</h1>
        {canWrite && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
          >
            {showForm ? 'Cancel' : 'Add mechanic'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="form-card card" onSubmit={handleSubmit} onChange={() => setHasUnsavedChanges(true)}>
          <h2 className="form-card__title">New mechanic</h2>
          {formError && <div className="form-card__error" role="alert">{formError}</div>}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="mec-name">Name</label>
              <input
                id="mec-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="mec-phone">Phone</label>
              <input
                id="mec-phone"
                type="tel"
                className="input"
                value={phone_number}
                onChange={(e) => setPhone_number(e.target.value)}
              />
            </div>
            {canSeeAllSites && (
              <div className="form-group">
                <label className="label">Site</label>
                <select
                  id="mec-site"
                  className="select"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  required
                >
                  <option value="">Select site</option>
                  {(sitesList || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="form-card__actions">
            <button type="button" className="btn btn--secondary" onClick={() => { setHasUnsavedChanges(false); setShowForm(false); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <PageError error={error} onRetry={load} />
        </div>
      )}
      {!error && (
        <div className="card table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty">No mechanics yet. Use “Add mechanic” to create one.</div>
        ) : (
          <>
            <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/mechanics/${r.id}`} className="history-link">
                      {r.name}
                    </Link>
                  </td>
                  <td>{r.phone_number || '—'}</td>
                  <td>{siteName(r.site)}</td>
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
