import { useCallback, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg, toList } from '../api/client'
import { usePagination } from '../hooks/usePagination'
import { useAsyncData } from '../hooks/useAsyncData'
import Pagination from '../components/Pagination'
import PageError from '../components/PageError'
import './GenericListPage.css'

export default function SitesPage() {
  const { canWrite, canSeeAllSites } = useAuth()
  if (!canSeeAllSites) return <Navigate to="/" replace />
  const { data: rawList, loading, error, refetch } = useAsyncData(() => sites.list(), [])
  const list = toList(rawList ?? null)
  const load = useCallback(() => refetch(), [refetch])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [contact_number, setContact_number] = useState('')

  const { paginatedItems, currentPage, totalPages, pageSize, setPage, setPageSize } = usePagination(list, 10)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!name.trim()) { setFormError('Name is required.'); return }
    if (!location.trim()) { setFormError('Location is required.'); return }
    if (!contact_number.trim()) { setFormError('Contact number is required.'); return }
    setSubmitting(true)
    try {
      await sites.create({
        name: name.trim(),
        location: location.trim(),
        contact_number: contact_number.trim(),
      })
      setName('')
      setLocation('')
      setContact_number('')
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
      <div className="page-header">
        <h1 className="page-title">Sites</h1>
        {canWrite && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
          >
            {showForm ? 'Cancel' : 'Add site'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="form-card card" onSubmit={handleSubmit}>
          <h2 className="form-card__title">New site</h2>
          {formError && <div className="form-card__error" role="alert">{formError}</div>}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="site-name">Name</label>
              <input
                id="site-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="site-location">Location</label>
              <input
                id="site-location"
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="site-contact">Contact number</label>
              <input
                id="site-contact"
                type="tel"
                className="input"
                value={contact_number}
                onChange={(e) => setContact_number(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-card__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>
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
          <div className="empty">No sites yet. Use “Add site” to create one.</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.location || '—'}</td>
                    <td>{r.contact_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={list.length}
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
