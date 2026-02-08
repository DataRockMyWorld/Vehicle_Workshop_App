import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { customers } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg } from '../api/client'
import { usePaginatedList } from '../hooks/usePaginatedList'
import Pagination from '../components/Pagination'
import Loader from '../components/Loader'
import PageError from '../components/PageError'
import './GenericListPage.css'

export default function CustomersPage() {
  const { canWrite } = useAuth()
  const { items: list, count, loading, error, page, setPage, totalPages, pageSize, refetch } = usePaginatedList(
    (p) => customers.list(p),
    []
  )
  const load = useCallback(() => refetch(), [refetch])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [first_name, setFirst_name] = useState('')
  const [last_name, setLast_name] = useState('')
  const [email, setEmail] = useState('')
  const [phone_number, setPhone_number] = useState('')
  const [receive_service_reminders, setReceive_service_reminders] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const raw = phone_number.trim().replace(/\D/g, '')
    if (!first_name.trim() || !last_name.trim()) {
      setFormError('First name and last name are required.')
      return
    }
    if (!raw || raw.length < 6) {
      setFormError('Phone number is required and must be at least 6 digits.')
      return
    }
    setSubmitting(true)
    try {
      await customers.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim() || null,
        phone_number: raw,
        receive_service_reminders,
      })
      setFirst_name('')
      setLast_name('')
      setEmail('')
      setPhone_number('')
      setReceive_service_reminders(true)
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
        <h1 className="page-title">Customers</h1>
        {canWrite && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
          >
            {showForm ? 'Cancel' : 'Add customer'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="form-card card" onSubmit={handleSubmit}>
          <h2 className="form-card__title">New customer</h2>
          {formError && <div className="form-card__error" role="alert">{formError}</div>}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="cust-first">First name</label>
              <input
                id="cust-first"
                className="input"
                value={first_name}
                onChange={(e) => setFirst_name(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="cust-last">Last name</label>
              <input
                id="cust-last"
                className="input"
                value={last_name}
                onChange={(e) => setLast_name(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="cust-email">Email</label>
              <input
                id="cust-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="cust-phone">Phone number</label>
              <input
                id="cust-phone"
                type="tel"
                className="input"
                value={phone_number}
                onChange={(e) => setPhone_number(e.target.value)}
                placeholder="e.g. 1234567890"
                required
              />
            </div>
            <div className="form-group form-group--check form-group--full">
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={receive_service_reminders}
                  onChange={(e) => setReceive_service_reminders(e.target.checked)}
                />
                Send service reminders (SMS/email when vehicle is due)
              </label>
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
          <Loader label="Loading customers…" />
        ) : list.length === 0 ? (
          <div className="empty">No customers yet. Use “Add customer” to create one.</div>
        ) : (
          <>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Reminders</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/customers/${r.id}`} className="history-link">
                      {r.first_name} {r.last_name}
                    </Link>
                  </td>
                  <td>{r.email || '—'}</td>
                  <td>{r.phone_number ?? '—'}</td>
                  <td>{r.receive_service_reminders !== false ? 'Yes' : 'No'}</td>
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
