import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { vehicles, customers, serviceRequests, sites, mechanics } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import { CAR_MAKES, getModelsForMake } from '../data/carMakesModels'
import './VehicleDetailPage.css'

function buildLookups(customers, sites, mechanics) {
  const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const c = byId(customers)
  const s = byId(sites)
  const m = byId(mechanics)
  return {
    customer: (id) => (c[id] ? `${c[id].first_name} ${c[id].last_name}` : `#${id}`),
    site: (id) => (s[id] ? s[id].name : `#${id}`),
    mechanic: (id) => (m[id] ? m[id].name : id ? `#${id}` : '—'),
  }
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}

export default function VehicleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canWrite, canSeeAllSites, siteId } = useAuth()
  const [vehicle, setVehicle] = useState(null)
  const [history, setHistory] = useState([])
  const [customersList, setCustomersList] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [mechanicsList, setMechanicsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editMake, setEditMake] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editYear, setEditYear] = useState('')
  const [editLicensePlate, setEditLicensePlate] = useState('')
  const [editCustomer, setEditCustomer] = useState('')
  const [editSite, setEditSite] = useState('')
  const [editLastServiced, setEditLastServiced] = useState('')
  const [editServiceIntervalDays, setEditServiceIntervalDays] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      vehicles.get(id),
      serviceRequests.list({ vehicle_id: id ? parseInt(id, 10) : undefined }),
      customers.list(),
      sites.list(),
      mechanics.list(),
    ])
      .then(([v, h, c, s, m]) => {
        setVehicle(v)
        setHistory(toList(h))
        setCustomersList(toList(c))
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
    if (vehicle) {
      setEditMake(vehicle.make || '')
      setEditModel(vehicle.model || '')
      setEditYear(vehicle.year ? String(vehicle.year) : '')
      setEditLicensePlate(vehicle.license_plate || '')
      setEditCustomer(vehicle.customer ? String(vehicle.customer) : '')
      setEditSite(vehicle.site ? String(vehicle.site) : '')
      setEditLastServiced(vehicle.last_serviced ? vehicle.last_serviced : '')
      setEditServiceIntervalDays(vehicle.service_interval_days ? String(vehicle.service_interval_days) : '')
    }
  }, [vehicle])

  const lk = buildLookups(customersList, sitesList, mechanicsList)

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const y = parseInt(editYear, 10)
    const effectiveSite = siteId ? siteId : (editSite ? parseInt(editSite, 10) : null)
    if (!editCustomer || !editMake.trim() || !editModel.trim() || !editLicensePlate.trim() || !effectiveSite) {
      setFormError('Customer, make, model, license plate, and site are required.')
      return
    }
    if (!editYear.trim() || isNaN(y) || y < 1900 || y > 2100) {
      setFormError('Year must be a valid number (1900–2100).')
      return
    }
    setSubmitting(true)
    try {
      await vehicles.update(Number(id), {
        customer: parseInt(editCustomer, 10),
        make: editMake.trim(),
        model: editModel.trim(),
        year: y,
        license_plate: editLicensePlate.trim(),
        site: effectiveSite,
        last_serviced: editLastServiced || null,
        service_interval_days: editServiceIntervalDays ? parseInt(editServiceIntervalDays, 10) : null,
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
      await vehicles.delete(Number(id))
      navigate('/vehicles')
    } catch (e) {
      setFormError(apiErrorMsg(e))
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="vehicle-detail">
        <div className="page-header">
          <Link to="/vehicles" className="btn btn--ghost">← Vehicles</Link>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

  if (loading || !vehicle) {
    return (
      <div className="vehicle-detail">
        <div className="page-header">
          <Link to="/vehicles" className="btn btn--ghost">← Vehicles</Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  return (
    <div className="vehicle-detail">
      <div className="page-header page-header--row">
        <div className="page-header__main">
          <Link to="/vehicles" className="btn btn--ghost">← Vehicles</Link>
          <h1 className="page-title">
            {vehicle.make} {vehicle.model} ({vehicle.license_plate})
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
        <form className="form-card card vehicle-detail__edit-form" onSubmit={handleEditSubmit}>
          <h2 className="vehicle-detail__card-title">Edit vehicle</h2>
          {formError && <p className="form-card__error" role="alert">{formError}</p>}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="edit-customer">Customer</label>
              <select
                id="edit-customer"
                className="select"
                value={editCustomer}
                onChange={(e) => setEditCustomer(e.target.value)}
                required
              >
                <option value="">Select customer</option>
                {(customersList || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>
            {!siteId && (
              <div className="form-group">
                <label className="label" htmlFor="edit-site">Site</label>
                <select
                  id="edit-site"
                  className="select"
                  value={editSite}
                  onChange={(e) => setEditSite(e.target.value)}
                  required
                >
                  <option value="">Select site</option>
                  {(sitesList || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {siteId && (
              <div className="form-group">
                <label className="label">Site</label>
                <div className="input input--readonly">
                  {sitesList.find((s) => s.id === siteId)?.name ?? `Site #${siteId}`}
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="label" htmlFor="edit-make">Make</label>
              <select
                id="edit-make"
                className="select"
                value={CAR_MAKES.includes(editMake) ? editMake : (editMake ? '__other__' : '')}
                onChange={(e) => {
                  const v = e.target.value
                  setEditMake(v === '__other__' ? '' : v)
                  setEditModel('')
                }}
                required={!editMake}
              >
                <option value="">Select make</option>
                <option value="__other__">Other (type below)</option>
                {CAR_MAKES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {(!editMake || !CAR_MAKES.includes(editMake)) && (
                <input
                  className="input"
                  style={{ marginTop: '0.5rem' }}
                  placeholder="Or type make"
                  value={CAR_MAKES.includes(editMake) ? '' : editMake}
                  onChange={(e) => setEditMake(e.target.value)}
                />
              )}
            </div>
            <div className="form-group">
              <label className="label" htmlFor="edit-model">Model</label>
              {editMake && CAR_MAKES.includes(editMake) ? (
                <>
                  <select
                    id="edit-model"
                    className="select"
                    value={getModelsForMake(editMake).includes(editModel) ? editModel : (editModel ? '__other__' : '')}
                    onChange={(e) => {
                      const v = e.target.value
                      setEditModel(v === '__other__' ? '' : v)
                    }}
                    required={!editModel}
                  >
                    <option value="">Select model</option>
                    <option value="__other__">Other (type below)</option>
                    {getModelsForMake(editMake).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {(!editModel || !getModelsForMake(editMake).includes(editModel)) && (
                    <input
                      className="input"
                      style={{ marginTop: '0.5rem' }}
                      placeholder="Or type model"
                      value={getModelsForMake(editMake).includes(editModel) ? '' : editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                    />
                  )}
                </>
              ) : (
                <input
                  id="edit-model"
                  className="input"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  placeholder="Enter model"
                  required
                />
              )}
            </div>
            <div className="form-group">
              <label className="label" htmlFor="edit-year">Year</label>
              <input
                id="edit-year"
                type="number"
                min="1900"
                max="2100"
                className="input"
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="edit-plate">License plate</label>
              <input
                id="edit-plate"
                className="input"
                value={editLicensePlate}
                onChange={(e) => setEditLicensePlate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="edit-last-serviced">Last serviced</label>
              <input
                id="edit-last-serviced"
                type="date"
                className="input"
                value={editLastServiced}
                onChange={(e) => setEditLastServiced(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="edit-interval">Service reminder interval (days)</label>
              <input
                id="edit-interval"
                type="number"
                min="30"
                max="730"
                className="input"
                value={editServiceIntervalDays}
                onChange={(e) => setEditServiceIntervalDays(e.target.value)}
                placeholder="180 (default)"
              />
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

      <div className="vehicle-detail__grid">
        <div className="card vehicle-detail__card">
          <h2 className="vehicle-detail__card-title">Details</h2>
          <dl className="vehicle-detail__dl">
            <dt>Owner</dt>
            <dd>
              <Link to={`/customers/${vehicle.customer}`} className="vehicle-detail__link">
                {lk.customer(vehicle.customer)}
              </Link>
            </dd>
            <dt>Year</dt>
            <dd>{vehicle.year || '—'}</dd>
            <dt>Site</dt>
            <dd>{lk.site(vehicle.site)}</dd>
            <dt>Last serviced</dt>
            <dd>{vehicle.last_serviced ? fmtDate(vehicle.last_serviced) : '—'}</dd>
            <dt>Service reminder</dt>
            <dd>{vehicle.service_interval_days ? `Every ${vehicle.service_interval_days} days` : '—'}</dd>
          </dl>
        </div>
      </div>

      <div className="card vehicle-detail__history-card">
        <h2 className="vehicle-detail__card-title">Service history</h2>
        {history.length === 0 ? (
          <p className="vehicle-detail__muted">No service requests yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mechanic</th>
                  <th>Service type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sr) => (
                  <tr key={sr.id}>
                    <td>{fmtDate(sr.created_at)}</td>
                    <td>{lk.mechanic(sr.assigned_mechanic)}</td>
                    <td>{sr.service_type_display || '—'}</td>
                    <td>
                      <Link to={`/service-requests/${sr.id}`} className="vehicle-detail__sr-link">
                        <span className={`badge badge--${(sr.status || '').toLowerCase().replace(' ', '-')}`}>
                          {sr.status}
                        </span>
                        <span className="vehicle-detail__sr-id"> {(sr as { display_number?: string }).display_number ?? `#${sr.id}`}</span>
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
