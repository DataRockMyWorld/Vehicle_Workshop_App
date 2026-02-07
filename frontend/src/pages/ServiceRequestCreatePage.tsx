import { useState, useEffect } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { serviceRequests, serviceCategories, customers, vehicles, sites } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import './ServiceRequestCreatePage.css'

export default function ServiceRequestCreatePage() {
  const navigate = useNavigate()
  const { canWrite, siteId: userSiteId } = useAuth()
  if (!canWrite) return <Navigate to="/service-requests" replace />
  const [customersList, setCustomersList] = useState([])
  const [vehiclesList, setVehiclesList] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [serviceCategoriesList, setServiceCategoriesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [siteId, setSiteId] = useState(userSiteId ? String(userSiteId) : '')
  const [status, setStatus] = useState('Pending')
  const [serviceCategoryId, setServiceCategoryId] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [description, setDescription] = useState('')

  const STATUS_OPTIONS = [
    { value: 'Pending', label: 'Pending' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
  ]

  const vehiclesForCustomer = customerId
    ? (vehiclesList || []).filter((v) => String(v.customer) === String(customerId))
    : []

  useEffect(() => {
    Promise.all([customers.list(), vehicles.list(), sites.list(), serviceCategories.list()])
      .then(([c, v, s, cats]) => {
        setCustomersList(toList(c))
        setVehiclesList(toList(v))
        setSitesList(toList(s))
        setServiceCategoriesList(Array.isArray(cats) ? cats : [])
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!customerId) setVehicleId('')
  }, [customerId])

  useEffect(() => {
    if (!serviceCategoryId) setServiceTypeId('')
  }, [serviceCategoryId])

  useEffect(() => {
    if (userSiteId) setSiteId(String(userSiteId))
  }, [userSiteId])

  const typesForCategory = serviceCategoryId
    ? (serviceCategoriesList.find((c) => c.id === parseInt(serviceCategoryId, 10))?.service_types || [])
    : []

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!customerId || !vehicleId || !siteId || !status || !description.trim()) return
    setError(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        customer: parseInt(customerId, 10),
        site: parseInt(siteId, 10),
        status,
        service_type: serviceTypeId ? parseInt(serviceTypeId, 10) : null,
        description: description.trim(),
        vehicle: parseInt(vehicleId, 10),
      }
      const created = (await serviceRequests.create(payload)) as { id: number }
      navigate(`/service-requests/${created.id}`)
    } catch (e) {
      setError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="sr-create">
        <div className="sr-create__header">
          <Link to="/service-requests" className="sr-create__back">← Back to service requests</Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  return (
    <div className="sr-create">
      <div className="sr-create__header">
        <Link to="/service-requests" className="sr-create__back">← Back to service requests</Link>
        <h1 className="sr-create__title">New service request</h1>
        <p className="sr-create__subtitle">Create a new service request for a customer vehicle</p>
      </div>

      {error && (
        <div className="sr-create__error" role="alert">
          {apiErrorMsg(error)}
        </div>
      )}

      <form className="sr-create__form" onSubmit={handleSubmit}>
        <div className="sr-create__main">
          <div className="sr-create__grid">
            <section className="sr-create__section">
            <h3 className="sr-create__section-title">Customer & vehicle</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="customer">Customer</label>
                <select
                  id="customer"
                  className="select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">Select customer</option>
                  {(customersList || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                      {c.email ? ` — ${c.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label" htmlFor="vehicle">Vehicle</label>
                <select
                  id="vehicle"
                  className="select"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                  disabled={!customerId}
                >
                  <option value="">Select vehicle</option>
                  {vehiclesForCustomer.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.license_plate})
                    </option>
                  ))}
                </select>
                {customerId && vehiclesForCustomer.length === 0 && (
                  <p className="sr-create__hint">No vehicles for this customer. Add one first.</p>
                )}
              </div>
            </div>
          </section>

          <section className="sr-create__section">
            <h3 className="sr-create__section-title">Location & status</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Site</label>
                {userSiteId ? (
                  <div className="form-readonly">
                    {sitesList.find((s) => s.id === userSiteId)?.name ?? `Site #${userSiteId}`}
                  </div>
                ) : (
                  <select
                    id="site"
                    className="select"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    required
                  >
                    <option value="">Select site</option>
                    {(sitesList || []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="label" htmlFor="status">Status</label>
                <select
                  id="status"
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="sr-create__section">
            <h3 className="sr-create__section-title">Service type</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="service-category">Category</label>
                <select
                  id="service-category"
                  className="select"
                  value={serviceCategoryId}
                  onChange={(e) => {
                    setServiceCategoryId(e.target.value)
                    setServiceTypeId('')
                  }}
                >
                  <option value="">Select category (optional)</option>
                  {(serviceCategoriesList || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label" htmlFor="service-type">Specific type</label>
                <select
                  id="service-type"
                  className="select"
                  value={serviceTypeId}
                  onChange={(e) => setServiceTypeId(e.target.value)}
                  disabled={!serviceCategoryId}
                >
                  <option value="">Select type (optional)</option>
                  {typesForCategory.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            </section>
          </div>

          <section className="sr-create__section sr-create__section--description">
            <h3 className="sr-create__section-title">Description</h3>
            <textarea
            id="description"
            aria-label="Service description"
            className="input sr-create__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the service needed in detail…"
            rows={4}
            required
            />
          </section>

          <div className="sr-create__actions">
            <Link to="/service-requests" className="btn btn--secondary">Cancel</Link>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
