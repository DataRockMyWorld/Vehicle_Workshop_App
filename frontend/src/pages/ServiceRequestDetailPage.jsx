import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  serviceRequests,
  customers,
  vehicles,
  sites,
  mechanics,
  products,
  inventory,
  productUsage,
  invoices,
  promotions,
} from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import { formatCurrency } from '../utils/currency'
import { useAuth } from '../context/AuthContext'
import './ServiceRequestDetailPage.css'

function buildLookups(customers, vehicles, sites, mechanics) {
  const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const c = byId(customers)
  const v = byId(vehicles)
  const s = byId(sites)
  const m = byId(mechanics)
  return {
    customer: (id) => (c[id] ? `${c[id].first_name} ${c[id].last_name}` : `#${id}`),
    vehicle: (id) => (v[id] ? `${v[id].make} ${v[id].model} (${v[id].license_plate})` : `#${id}`),
    site: (id) => (s[id] ? s[id].name : `#${id}`),
    mechanic: (id) => (m[id] ? m[id].name : id ? `#${id}` : '—'),
  }
}

export default function ServiceRequestDetailPage() {
  const { id } = useParams()
  const { canWrite } = useAuth()
  const [sr, setSr] = useState(null)
  const [customersList, setCustomersList] = useState([])
  const [vehiclesList, setVehiclesList] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [mechanicsList, setMechanicsList] = useState([])
  const [productsList, setProductsList] = useState([])
  const [invList, setInvList] = useState([])
  const [usageList, setUsageList] = useState([])
  const [invoiceList, setInvoiceList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const [addingPart, setAddingPart] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [assignMechanicId, setAssignMechanicId] = useState('')
  const [addProductId, setAddProductId] = useState('')
  const [addQty, setAddQty] = useState(1)
  const [formError, setFormError] = useState('')
  const [promotionsList, setPromotionsList] = useState([])
  const [selectedPromotionId, setSelectedPromotionId] = useState('')
  const [manualDiscount, setManualDiscount] = useState('')
  const [laborCost, setLaborCost] = useState('')

  const lk = buildLookups(customersList, vehiclesList, sitesList, mechanicsList)
  const siteInv = (invList || []).filter((x) => sr && Number(x.site) === Number(sr.site))
  const invByProduct = Object.fromEntries(siteInv.map((x) => [x.product, x]))
  const productById = Object.fromEntries((productsList || []).map((p) => [p.id, p]))
  const available = (pid) => {
    const inv = invByProduct[pid]
    if (!inv) return 0
    const onHand = inv.quantity_on_hand ?? 0
    const reserved = inv.quantity_reserved ?? 0
    return Math.max(0, onHand - reserved)
  }
  const usageWithNames = (usageList || []).map((u) => {
    const p = productById[u.product]
    const price = p?.unit_price != null ? Number(p.unit_price) : 0
    const qty = u.quantity_used ?? 0
    return {
      ...u,
      productName: p?.name ?? `#${u.product}`,
      sku: p?.sku,
      unit: p?.unit_of_measure ?? 'each',
      unitPrice: price,
      lineTotal: price * qty,
    }
  })
  const invoiceForSr = (invoiceList || []).find((i) => i.service_request === (sr?.id ?? -1))

  const siteMechanics = (sr?.site && mechanicsList.filter((m) => m.site === sr.site)) || []
  const activeProducts = (productsList || []).filter((p) => p.is_active !== false)

  useEffect(() => {
    if (!id) return
    serviceRequests
      .get(id)
      .then((r) => {
        setSr(r)
        setAssignMechanicId(r.assigned_mechanic ? String(r.assigned_mechanic) : '')
        setLaborCost(r.labor_cost != null ? String(r.labor_cost) : '')
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !sr) return
    Promise.all([
      customers.list(),
      vehicles.list(),
      promotions.active().catch(() => []),
      sites.list(),
      mechanics.list(),
      products.list(),
      inventory.list(),
      productUsage.list(id),
      invoices.list(),
    ])
      .then(([c, v, prom, s, m, p, i, u, inv]) => {
        setCustomersList(toList(c))
        setVehiclesList(toList(v))
        setPromotionsList(Array.isArray(prom) ? prom : toList(prom))
        setSitesList(toList(s))
        setMechanicsList(toList(m))
        setProductsList(toList(p))
        setInvList(toList(i))
        setUsageList(toList(u))
        setInvoiceList(toList(inv))
      })
      .catch(setError)
  }, [id, sr])

  const handleAssign = async () => {
    if (!sr) return
    setFormError('')
    setAssigning(true)
    try {
      const updated = await serviceRequests.update(sr.id, {
        assigned_mechanic: assignMechanicId ? parseInt(assignMechanicId, 10) : null,
      })
      setSr(updated)
      setAssignMechanicId(updated.assigned_mechanic ? String(updated.assigned_mechanic) : '')
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setAssigning(false)
    }
  }

  const handleAddPart = async (e) => {
    e.preventDefault()
    if (!sr || !addProductId || addQty < 1) return
    setFormError('')
    setAddingPart(true)
    try {
      await productUsage.create({
        service_request: sr.id,
        product: parseInt(addProductId, 10),
        quantity_used: addQty,
      })
      const u = await productUsage.list(sr.id)
      setUsageList(u)
      setAddProductId('')
      setAddQty(1)
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setAddingPart(false)
    }
  }

  const handleComplete = async () => {
    if (!sr || sr.status === 'Completed') return
    if (!window.confirm('Mark this service request as completed? Inventory will be adjusted and an invoice created.')) return
    setFormError('')
    setCompleting(true)
    const body = {}
    if (selectedPromotionId) body.promotion_id = parseInt(selectedPromotionId, 10)
    if (manualDiscount.trim() && !isNaN(parseFloat(manualDiscount))) body.discount_amount = parseFloat(manualDiscount)
    if (laborCost.trim() && !isNaN(parseFloat(laborCost)) && parseFloat(laborCost) >= 0) body.labor_cost = parseFloat(laborCost)
    try {
      const updated = await serviceRequests.complete(sr.id, Object.keys(body).length ? body : null)
      setSr(updated)
      const [u, inv] = await Promise.all([productUsage.list(sr.id), invoices.list()])
      setUsageList(u)
      setInvoiceList(inv)
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setCompleting(false)
    }
  }

  if (error) {
    return (
      <div className="sr-detail">
        <div className="page-header">
          <Link to="/service-requests" className="btn btn--ghost">← Service requests</Link>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>{apiErrorMsg(error)}</p>
        </div>
      </div>
    )
  }

  if (loading || !sr) {
    return (
      <div className="sr-detail">
        <div className="page-header">
          <Link to="/service-requests" className="btn btn--ghost">← Service requests</Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  const canEdit = sr.status !== 'Completed' && canWrite

  return (
    <div className="sr-detail">
      <div className="page-header">
        <div className="sr-detail__back">
          <Link to="/service-requests" className="btn btn--ghost">← Service requests</Link>
          <span className="sr-detail__id">#{sr.id}</span>
        </div>
        <div className="sr-detail__actions">
          {canEdit && (
            <>
              {promotionsList.length > 0 && (
                <select
                  className="select"
                  value={selectedPromotionId}
                  onChange={(e) => setSelectedPromotionId(e.target.value)}
                  style={{ marginRight: '0.5rem', minWidth: '140px' }}
                  aria-label="Apply promotion"
                >
                  <option value="">No promotion</option>
                  {promotionsList.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.title}
                      {pr.discount_percent ? ` (${pr.discount_percent}% off)` : ''}
                      {pr.discount_amount ? ` (GH₵${pr.discount_amount} off)` : ''}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                className="input"
                placeholder="Discount"
                value={manualDiscount}
                onChange={(e) => setManualDiscount(e.target.value)}
                min="0"
                step="0.01"
                style={{ width: '90px', marginRight: '0.5rem' }}
                aria-label="Manual discount amount"
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleComplete}
                disabled={completing}
              >
                {completing ? 'Completing…' : 'Mark complete'}
              </button>
            </>
          )}
        </div>
      </div>

      {formError && (
        <div className="sr-detail__error" role="alert">
          {formError}
        </div>
      )}

      <div className="sr-detail__grid">
        <div className="card sr-detail__card sr-detail__details-card">
          <h2 className="sr-detail__card-title">Details</h2>
          <dl className="sr-detail__dl">
            <dt>Customer</dt>
            <dd>{lk.customer(sr.customer)}</dd>
            <dt>Vehicle</dt>
            <dd>{lk.vehicle(sr.vehicle)}</dd>
            <dt>Site</dt>
            <dd>{lk.site(sr.site)}</dd>
            <dt>Status</dt>
            <dd>
              <span className={`badge badge--${(sr.status || '').toLowerCase().replace(' ', '-')}`}>
                {sr.status || '—'}
              </span>
            </dd>
            <dt>Service type</dt>
            <dd>{sr.service_type_display || '—'}</dd>
            <dt>Assigned mechanic</dt>
            <dd>{lk.mechanic(sr.assigned_mechanic)}</dd>
            <dt>Labor / workmanship cost</dt>
            <dd>
              {canEdit ? (
                <span className="sr-detail__labor-edit">
                  GH₵
                  <input
                    type="number"
                    className="input"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    onBlur={async () => {
                      const val = laborCost.trim()
                      const num = val ? parseFloat(val) : 0
                      if (!isNaN(num) && num >= 0 && sr.labor_cost !== num) {
                        try {
                          const updated = await serviceRequests.update(sr.id, {
                            labor_cost: num,
                          })
                          setSr(updated)
                          setLaborCost(updated.labor_cost != null ? String(updated.labor_cost) : '')
                        } catch (e) {
                          setFormError(apiErrorMsg(e))
                        }
                      }
                    }}
                    min="0"
                    step="0.01"
                    style={{ width: '100px' }}
                  />
                </span>
              ) : (
                formatCurrency(sr.labor_cost)
              )}
            </dd>
          </dl>
          <p className="sr-detail__description">{sr.description || '—'}</p>
        </div>

        <div className="card sr-detail__card sr-detail__mechanic-card">
          <h2 className="sr-detail__card-title">Assign mechanic</h2>
          {canEdit ? (
            <div className="sr-detail__assign">
              <select
                className="select"
                value={assignMechanicId}
                onChange={(e) => setAssignMechanicId(e.target.value)}
              >
                <option value="">— None —</option>
                {siteMechanics.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleAssign}
                disabled={assigning}
              >
                {assigning ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : (
            <p className="sr-detail__muted">{lk.mechanic(sr.assigned_mechanic)}</p>
          )}
        </div>

        <div className="card sr-detail__card sr-detail__card--wide">
          <h2 className="sr-detail__card-title">Parts used</h2>
          {canEdit && (
            <form className="sr-detail__add-part" onSubmit={handleAddPart}>
              <select
                className="select"
                value={addProductId}
                onChange={(e) => {
                  setAddProductId(e.target.value)
                  setAddQty(1)
                }}
                required
              >
                <option value="">Select product</option>
                {activeProducts.map((p) => {
                  const av = available(p.id)
                  const label = p.sku ? `${p.name} (${p.sku})` : p.name
                  return (
                    <option key={p.id} value={p.id} disabled={av < 1}>
                      {label} {av < 1 ? '— out of stock' : `· ${av} available`}
                    </option>
                  )
                })}
              </select>
              <input
                type="number"
                min={1}
                max={addProductId ? available(parseInt(addProductId, 10)) : undefined}
                className="input"
                value={addQty}
                onChange={(e) => setAddQty(parseInt(e.target.value, 10) || 1)}
                style={{ width: '80px' }}
              />
              <button type="submit" className="btn btn--secondary" disabled={addingPart || !addProductId}>
                {addingPart ? 'Adding…' : 'Add'}
              </button>
            </form>
          )}
          {usageWithNames.length === 0 ? (
            <p className="sr-detail__muted">No parts added yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Unit price</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {usageWithNames.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.productName}
                        {u.sku ? <span className="sr-detail__sku"> ({u.sku})</span> : null}
                      </td>
                      <td>{u.quantity_used}</td>
                      <td>{u.unit}</td>
                      <td>{formatCurrency(u.unitPrice)}</td>
                      <td>{formatCurrency(u.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {invoiceForSr && (
          <div className="card sr-detail__card sr-detail__card--wide">
            <h2 className="sr-detail__card-title">Invoice</h2>
            <dl className="sr-detail__dl">
              {(() => {
                const labor = Number(sr.labor_cost ?? 0)
                const parts = usageWithNames.reduce((s, u) => s + u.lineTotal, 0)
                if (labor > 0) {
                  return (
                    <>
                      <dt>Parts</dt>
                      <dd>{formatCurrency(parts)}</dd>
                      <dt>Labor</dt>
                      <dd>{formatCurrency(labor)}</dd>
                    </>
                  )
                }
                return null
              })()}
              {Number(invoiceForSr.discount_amount ?? 0) > 0 && (
                <>
                  <dt>Discount</dt>
                  <dd>-{formatCurrency(invoiceForSr.discount_amount)}</dd>
                </>
              )}
              <dt>Total</dt>
              <dd>{formatCurrency(invoiceForSr.total_cost)}</dd>
              <dt>Paid</dt>
              <dd>{invoiceForSr.paid ? 'Yes' : 'No'}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
