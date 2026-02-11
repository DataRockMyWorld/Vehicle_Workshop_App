import { useState, useEffect } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { serviceRequests, customers, sites } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import './PartsSaleCreatePage.css'

export default function PartsSaleCreatePage() {
  const navigate = useNavigate()
  const { canWrite, siteId: userSiteId } = useAuth()
  if (!canWrite) return <Navigate to="/parts-sale" replace />
  const [customersList, setCustomersList] = useState([])
  const [walkinCustomer, setWalkinCustomer] = useState<{ id: number } | null>(null)
  const [sitesList, setSitesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [quickSale, setQuickSale] = useState(true)
  const [customerId, setCustomerId] = useState('')
  const [siteId, setSiteId] = useState(userSiteId ? String(userSiteId) : '')

  useEffect(() => {
    Promise.all([
      customers.list(),
      customers.walkin(),
      sites.list(),
    ])
      .then(([c, walkin, s]) => {
        setCustomersList(toList(c))
        setWalkinCustomer(walkin as { id: number })
        setSitesList(toList(s))
      })
      .catch((e) => setError(apiErrorMsg(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (userSiteId) setSiteId(String(userSiteId))
  }, [userSiteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const custId = quickSale ? walkinCustomer?.id : (customerId ? parseInt(customerId, 10) : null)
    const effectiveSiteId = userSiteId ?? (siteId ? parseInt(siteId, 10) : null)
    if (!custId || !effectiveSiteId) return
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        customer: custId,
        site: effectiveSiteId,
        vehicle: null,
        status: 'Draft',
        service_type: null,
        description: 'Sales',
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
      <div className="parts-sale-create">
        <div className="parts-sale-create__header">
          <Link to="/parts-sale" className="parts-sale-create__back">← Back to sales</Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  return (
    <div className="parts-sale-create">
      <div className="parts-sale-create__header">
        <Link to="/parts-sale" className="parts-sale-create__back">← Back to sales</Link>
        <h1 className="parts-sale-create__title">New sale</h1>
        <p className="parts-sale-create__subtitle">Sell parts to a walk-in or registered customer</p>
      </div>

      {error && (
        <div className="parts-sale-create__error" role="alert">
          {error}
        </div>
      )}

      <form className="parts-sale-create__form" onSubmit={handleSubmit}>
        <div className="parts-sale-create__main">
          <section className="parts-sale-create__section">
            <h3 className="parts-sale-create__section-title">Customer</h3>
            <div className="parts-sale-create__mode">
              <label className="parts-sale-create__radio">
                <input
                  type="radio"
                  name="mode"
                  checked={quickSale}
                  onChange={() => setQuickSale(true)}
                />
                <span>Quick sale (walk-in, no customer record)</span>
              </label>
              <label className="parts-sale-create__radio">
                <input
                  type="radio"
                  name="mode"
                  checked={!quickSale}
                  onChange={() => setQuickSale(false)}
                />
                <span>Registered customer</span>
              </label>
            </div>
            {quickSale ? (
              <p className="parts-sale-create__hint">
                Use for anonymous or cash-only sales. No customer details needed.
              </p>
            ) : (
              <div className="form-group">
                <label className="label" htmlFor="customer">Customer</label>
                <select
                  id="customer"
                  className="select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required={!quickSale}
                >
                  <option value="">Select customer</option>
                  {(customersList || []).map((c: { id: number; first_name: string; last_name: string; email?: string }) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                      {c.email ? ` — ${c.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {!userSiteId && (
            <section className="parts-sale-create__section">
              <h3 className="parts-sale-create__section-title">Location</h3>
              <div className="form-group">
                <label className="label">Site</label>
                <select
                  id="site"
                  className="select"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  required
                >
                  <option value="">Select site</option>
                  {(sitesList || []).map((s: { id: number; name: string }) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </section>
          )}

          <div className="parts-sale-create__actions">
            <Link to="/parts-sale" className="btn btn--secondary">Cancel</Link>
            <button type="submit" className="btn btn--primary" disabled={submitting || (quickSale && !walkinCustomer)}>
              {submitting ? 'Creating…' : 'Add items'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
