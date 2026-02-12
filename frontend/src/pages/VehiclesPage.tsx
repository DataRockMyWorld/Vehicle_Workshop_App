import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { vehicles, customers, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import UnsavedChangesModal from '../components/UnsavedChangesModal'
import { apiErrorMsg, toList } from '../api/client'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useAsyncData } from '../hooks/useAsyncData'
import Pagination from '../components/Pagination'
import Loader from '../components/Loader'
import PageError from '../components/PageError'
import { CAR_MAKES, getModelsForMake } from '../data/carMakesModels'
import './GenericListPage.css'

export default function VehiclesPage() {
  const { canWrite, canSeeAllSites, siteId: userSiteId } = useAuth()
  const { items: list, count, loading, error, page, setPage, totalPages, pageSize, refetch } = usePaginatedList(
    (p) => vehicles.list(p),
    []
  )
  const { data: lookupData } = useAsyncData(
    () => Promise.all([customers.list(), sites.list()]),
    []
  )
  const [cust, sitesList] = lookupData
    ? [toList(lookupData[0]), toList(lookupData[1])]
    : [[], []]
  const load = useCallback(() => refetch(), [refetch])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [customer, setCustomer] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [license_plate, setLicense_plate] = useState('')
  const [site, setSite] = useState(userSiteId ? String(userSiteId) : '')
  const [service_interval_days, setService_interval_days] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { showWarning, confirmNavigation, cancelNavigation } = useUnsavedChanges(hasUnsavedChanges)

  useEffect(() => {
    if (userSiteId) setSite(String(userSiteId))
  }, [userSiteId])

  const byId = (arr, id) => (arr || []).find((x) => x.id === parseInt(id, 10))
  const name = (id) => {
    const c = byId(cust, id)
    return c ? `${c.first_name} ${c.last_name}` : `#${id}`
  }
  const siteName = (id) => {
    const s = byId(sitesList, id)
    return s ? s.name : `#${id}`
  }

  const effectiveSite = canSeeAllSites ? (site ? parseInt(site, 10) : null) : userSiteId
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const y = parseInt(year, 10)
    if (!customer || !make.trim() || !model.trim() || !license_plate.trim() || !effectiveSite) {
      setFormError(canSeeAllSites ? 'Customer, make, model, license plate, and site are required.' : 'Customer, make, model, and license plate are required.')
      return
    }
    if (!year.trim() || isNaN(y) || y < 1900 || y > 2100) {
      setFormError('Year must be a valid number (1900–2100).')
      return
    }
    setSubmitting(true)
    try {
      await vehicles.create({
        customer: parseInt(customer, 10),
        make: make.trim(),
        model: model.trim(),
        year: y,
        license_plate: license_plate.trim(),
        site: effectiveSite,
        service_interval_days: service_interval_days ? parseInt(service_interval_days, 10) : null,
      })
      setCustomer('')
      setMake('')
      setModel('')
      setYear('')
      setLicense_plate('')
      setSite(userSiteId ? String(userSiteId) : '')
      setService_interval_days('')
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
        <h1 className="page-title">Vehicles</h1>
        {canWrite && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { if (showForm) setHasUnsavedChanges(false); setShowForm(!showForm); }}
            aria-expanded={showForm}
          >
            {showForm ? 'Cancel' : 'Add vehicle'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="form-card card" onSubmit={handleSubmit} onChange={() => setHasUnsavedChanges(true)}>
          <h2 className="form-card__title">New vehicle</h2>
          {formError && <div className="form-card__error" role="alert">{formError}</div>}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="veh-customer">Customer</label>
              <select
                id="veh-customer"
                className="select"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
              >
                <option value="">Select customer</option>
                {(cust || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>
            {canSeeAllSites && (
              <div className="form-group">
                <label className="label" htmlFor="veh-site">Site</label>
                <select
                  id="veh-site"
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
            <div className="form-group">
              <label className="label" htmlFor="veh-make">Make</label>
              <select
                id="veh-make"
                className="select"
                value={CAR_MAKES.includes(make) ? make : (make ? '__other__' : '')}
                onChange={(e) => {
                  const v = e.target.value
                  setMake(v === '__other__' ? '' : v)
                  setModel('')
                }}
                required={!make}
              >
                <option value="">Select make</option>
                <option value="__other__">Other (type below)</option>
                {CAR_MAKES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {(!make || !CAR_MAKES.includes(make)) && (
                <input
                  className="input"
                  style={{ marginTop: '0.5rem' }}
                  placeholder="Or type make"
                  value={CAR_MAKES.includes(make) ? '' : make}
                  onChange={(e) => setMake(e.target.value)}
                />
              )}
            </div>
            <div className="form-group">
              <label className="label" htmlFor="veh-model">Model</label>
              {make && CAR_MAKES.includes(make) ? (
                <>
                  <select
                    id="veh-model"
                    className="select"
                    value={getModelsForMake(make).includes(model) ? model : (model ? '__other__' : '')}
                    onChange={(e) => {
                      const v = e.target.value
                      setModel(v === '__other__' ? '' : v)
                    }}
                    required={!model}
                  >
                    <option value="">Select model</option>
                    <option value="__other__">Other (type below)</option>
                    {getModelsForMake(make).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {(!model || !getModelsForMake(make).includes(model)) && (
                    <input
                      className="input"
                      style={{ marginTop: '0.5rem' }}
                      placeholder="Or type model"
                      value={getModelsForMake(make).includes(model) ? '' : model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  )}
                </>
              ) : (
                <input
                  id="veh-model"
                  className="input"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Enter model"
                  required
                />
              )}
            </div>
            <div className="form-group">
              <label className="label" htmlFor="veh-year">Year</label>
              <input
                id="veh-year"
                type="number"
                min="1900"
                max="2100"
                className="input"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="veh-plate">License plate</label>
              <input
                id="veh-plate"
                className="input"
                value={license_plate}
                onChange={(e) => setLicense_plate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="veh-interval">Service reminder interval (days)</label>
              <input
                id="veh-interval"
                type="number"
                min="30"
                max="730"
                className="input"
                value={service_interval_days}
                onChange={(e) => setService_interval_days(e.target.value)}
                placeholder="180 (default)"
              />
            </div>
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
          <Loader label="Loading vehicles…" />
        ) : list.length === 0 ? (
          <div className="empty">No vehicles yet. Use “Add vehicle” to create one.</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Make / Model</th>
                  <th>Year</th>
                  <th>License</th>
                  <th>Customer</th>
                  {canSeeAllSites && <th>Site</th>}
                  <th>Last serviced</th>
                  <th>Reminder (days)</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/vehicles/${r.id}`} className="history-link">
                        {r.make} {r.model}
                      </Link>
                    </td>
                    <td>{r.year}</td>
                    <td>{r.license_plate}</td>
                    <td>
                      <Link to={`/customers/${r.customer}`} className="history-link">
                        {name(r.customer)}
                      </Link>
                    </td>
                    {canSeeAllSites && <td>{siteName(r.site)}</td>}
                    <td>{r.last_serviced ? new Date(r.last_serviced).toLocaleDateString() : '—'}</td>
                    <td>{r.service_interval_days || 180}</td>
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
