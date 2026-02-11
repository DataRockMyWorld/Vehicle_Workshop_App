import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { customers, serviceRequests, vehicles, sites, mechanics } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import './CustomerDetailPage.css'

function buildLookups(vehicles, sites, mechanics) {
  const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const v = byId(vehicles)
  const s = byId(sites)
  const m = byId(mechanics)
  return {
    vehicle: (id) => (!id ? 'Sales' : v[id] ? `${v[id].make} ${v[id].model} (${v[id].license_plate})` : `#${id}`),
    site: (id) => (s[id] ? s[id].name : `#${id}`),
    mechanic: (id) => (m[id] ? m[id].name : id ? `#${id}` : '—'),
  }
}

function fmtDate(d: string | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [history, setHistory] = useState([])
  const [vehiclesList, setVehiclesList] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [mechanicsList, setMechanicsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editFirst, setEditFirst] = useState('')
  const [editLast, setEditLast] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editReminders, setEditReminders] = useState(true)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      customers.get(id),
      serviceRequests.list({ customer_id: parseInt(id, 10) }),
      vehicles.list(),
      sites.list(),
      mechanics.list(),
    ])
      .then(([c, h, v, s, m]) => {
        setCustomer(c)
        setHistory(toList(h))
        setVehiclesList(toList(v))
        setSitesList(toList(s))
        setMechanicsList(toList(m))
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (customer) {
      setEditFirst(customer.first_name || '')
      setEditLast(customer.last_name || '')
      setEditEmail(customer.email || '')
      setEditPhone(customer.phone_number || '')
      setEditReminders(customer.receive_service_reminders !== false)
    }
  }, [customer])

  const lk = buildLookups(vehiclesList, sitesList, mechanicsList)
  const customerVehicles = (vehiclesList || []).filter((v) => String(v.customer) === String(id))

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!editFirst.trim() || !editLast.trim() || !editPhone.trim()) {
      setFormError('First name, last name, and phone are required.')
      return
    }
    setSubmitting(true)
    try {
      await customers.update(Number(id), {
        first_name: editFirst.trim(),
        last_name: editLast.trim(),
        email: editEmail.trim() || null,
        phone_number: editPhone.trim(),
        receive_service_reminders: editReminders,
      })
      setShowEditForm(false)
      loadData()
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await customers.delete(Number(id))
      navigate('/customers')
    } catch (e) {
      setFormError(apiErrorMsg(e))
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="customer-detail">
        <div className="page-header">
          <Link to="/customers" className="btn btn--ghost">← Customers</Link>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

  if (loading || !customer) {
    return (
      <div className="customer-detail">
        <div className="page-header">
          <Link to="/customers" className="btn btn--ghost">← Customers</Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  return (
    <div className="customer-detail">
      <div className="page-header page-header--row">
        <div className="page-header__main">
          <Link to="/customers" className="btn btn--ghost">← Customers</Link>
          <h1 className="page-title">
            {customer.first_name} {customer.last_name}
          </h1>
        </div>
        {canWrite && (
          <div className="page-header__actions">
            {!showEditForm ? (
              <>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowEditForm(true)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`btn ${confirmDelete ? 'btn--danger' : 'btn--ghost'}`}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete' : 'Delete'}
                </button>
                {confirmDelete && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {showEditForm && canWrite && (
        <form className="form-card card customer-detail__edit-form" onSubmit={handleEditSubmit}>
          <h2 className="customer-detail__card-title">Edit customer</h2>
          {formError && <p className="form-card__error" role="alert">{formError}</p>}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="edit-first">First name</label>
              <input
                id="edit-first"
                className="input"
                value={editFirst}
                onChange={(e) => setEditFirst(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="edit-last">Last name</label>
              <input
                id="edit-last"
                className="input"
                value={editLast}
                onChange={(e) => setEditLast(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="edit-email">Email</label>
              <input
                id="edit-email"
                type="email"
                className="input"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="edit-phone">Phone</label>
              <input
                id="edit-phone"
                type="tel"
                className="input"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label checkbox-label">
                <input
                  type="checkbox"
                  checked={editReminders}
                  onChange={(e) => setEditReminders(e.target.checked)}
                />
                Send service reminders
              </label>
            </div>
          </div>
          <div className="form-card__actions">
            <button type="button" className="btn btn--secondary" onClick={() => { setShowEditForm(false); setFormError(''); setConfirmDelete(false); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="customer-detail__grid">
        <div className="card customer-detail__card">
          <h2 className="customer-detail__card-title">Contact</h2>
          <dl className="customer-detail__dl">
            <dt>Email</dt>
            <dd>{customer.email || '—'}</dd>
            <dt>Phone</dt>
            <dd>{customer.phone_number || '—'}</dd>
            <dt>Service reminders</dt>
            <dd>{customer.receive_service_reminders !== false ? 'Yes' : 'No'}</dd>
          </dl>
        </div>

        <div className="card customer-detail__card">
          <h2 className="customer-detail__card-title">Vehicles ({customerVehicles.length})</h2>
          {customerVehicles.length === 0 ? (
            <p className="customer-detail__muted">No vehicles registered.</p>
          ) : (
            <ul className="customer-detail__list">
              {customerVehicles.map((v) => (
                <li key={v.id}>
                  <Link to={`/vehicles/${v.id}`} className="customer-detail__link">
                    {v.make} {v.model} ({v.license_plate})
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card customer-detail__history-card">
        <h2 className="customer-detail__card-title">Service history</h2>
        {history.length === 0 ? (
          <p className="customer-detail__muted">No service requests yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Site</th>
                  <th>Mechanic</th>
                  <th>Service type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sr) => (
                  <tr key={sr.id}>
                    <td>{fmtDate(sr.created_at)}</td>
                    <td>{lk.vehicle(sr.vehicle)}</td>
                    <td>{lk.site(sr.site)}</td>
                    <td>{lk.mechanic(sr.assigned_mechanic)}</td>
                    <td>{sr.service_type_display || '—'}</td>
                    <td>
                      <Link to={`/service-requests/${sr.id}`} className="customer-detail__sr-link">
                        <span className={`badge badge--${(sr.status || '').toLowerCase().replace(' ', '-')}`}>
                          {sr.status}
                        </span>
                        <span className="customer-detail__sr-id"> {(sr as { display_number?: string }).display_number ?? `#${sr.id}`}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
