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
import ProductSearch from '../components/ProductSearch'
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
    vehicle: (id) => (!id ? 'Parts sale' : v[id] ? `${v[id].make} ${v[id].model} (${v[id].license_plate})` : `#${id}`),
    site: (id) => (s[id] ? s[id].name : `#${id}`),
    mechanic: (id) => (m[id] ? m[id].name : id ? `#${id}` : '—'),
  }
}

export default function ServiceRequestDetailPage() {
  const { id } = useParams()
  const { canWrite } = useAuth()
  const [sr, setSr] = useState<Record<string, unknown> | null>(null)
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
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [assignMechanicId, setAssignMechanicId] = useState('')
  const [addProductId, setAddProductId] = useState('')
  const [addQty, setAddQty] = useState(1)
  const [formError, setFormError] = useState('')
  const [promotionsList, setPromotionsList] = useState([])
  const [selectedPromotionId, setSelectedPromotionId] = useState('')
  const [manualDiscount, setManualDiscount] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [editingUsageId, setEditingUsageId] = useState(null)
  const [editingQty, setEditingQty] = useState(1)
  const [updatingUsage, setUpdatingUsage] = useState(false)
  const [deletingUsageId, setDeletingUsageId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [markingPaid, setMarkingPaid] = useState(false)

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
  const srVehicle = sr?.vehicle ? vehiclesList?.find((v) => v.id === sr.vehicle) : null
  const vehicleForProductSearch = srVehicle ? `${srVehicle.make} ${srVehicle.model}` : ''
  const PAYMENT_LABELS = { cash: 'Cash', momo: 'MoMo', pos: 'POS' }

  useEffect(() => {
    if (!id) return
    serviceRequests
      .get(id)
      .then((r: Record<string, unknown>) => {
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
      const updated = (await serviceRequests.update(sr.id as number, {
        assigned_mechanic: assignMechanicId ? parseInt(assignMechanicId, 10) : null,
      })) as Record<string, unknown>
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
        service_request: sr.id as number,
        product: parseInt(addProductId, 10),
        quantity_used: addQty,
      })
      const u = await productUsage.list(sr.id as number)
      setUsageList(toList(u))
      setAddProductId('')
      setAddQty(1)
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setAddingPart(false)
    }
  }

  const handleEditPart = (u) => {
    setEditingUsageId(u.id)
    setEditingQty(u.quantity_used ?? 1)
  }

  const handleSavePart = async () => {
    if (!editingUsageId || editingQty < 1) return
    setFormError('')
    setUpdatingUsage(true)
    try {
      await productUsage.update(editingUsageId, { quantity_used: editingQty })
      const u = await productUsage.list(sr.id as number)
      setUsageList(toList(u))
      setEditingUsageId(null)
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setUpdatingUsage(false)
    }
  }

  const handleDeletePart = async (usageId) => {
    const msg = !sr?.vehicle ? 'Remove this item from the sale?' : 'Remove this part from the service request?'
    if (!window.confirm(msg)) return
    setFormError('')
    setDeletingUsageId(usageId)
    try {
      await productUsage.delete(usageId)
      const fresh = await productUsage.list(sr.id as number)
      setUsageList(toList(fresh))
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setDeletingUsageId(null)
    }
  }

  const handleMarkPaid = async () => {
    if (!invoiceForSr || invoiceForSr.paid) return
    setFormError('')
    setMarkingPaid(true)
    try {
      const updated = await invoices.update(invoiceForSr.id, {
        paid: true,
        payment_method: paymentMethod,
      })
      const inv = await invoices.list()
      setInvoiceList(toList(inv))
      setFormError('')
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setMarkingPaid(false)
    }
  }

  const isPartsSale = !sr?.vehicle

  const handleComplete = async () => {
    if (!sr || sr.status === 'Completed') return
    const confirmMsg = isPartsSale
      ? 'Complete this sale? An invoice will be created.'
      : 'Mark this service request as completed? Inventory will be adjusted and an invoice created.'
    if (!window.confirm(confirmMsg)) return
    setFormError('')
    setCompleting(true)
    const body: Record<string, unknown> = {}
    if (selectedPromotionId) body.promotion_id = parseInt(selectedPromotionId, 10)
    if (manualDiscount.trim() && !isNaN(parseFloat(manualDiscount))) body.discount_amount = parseFloat(manualDiscount)
    if (laborCost.trim() && !isNaN(parseFloat(laborCost)) && parseFloat(laborCost) >= 0) body.labor_cost = parseFloat(laborCost)
    try {
      const updated = (await serviceRequests.complete(sr.id as number, Object.keys(body).length ? body : undefined)) as Record<string, unknown>
      setSr(updated)
      const [u, inv] = await Promise.all([productUsage.list(sr.id as number), invoices.list()])
      setUsageList(toList(u))
      setInvoiceList(toList(inv))
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
          <Link to={isPartsSale ? '/parts-sale' : '/service-requests'} className="btn btn--ghost">
            {isPartsSale ? '← Parts sales' : '← Service requests'}
          </Link>
          <span className="sr-detail__id">{isPartsSale ? `Parts sale #${String(sr.id)}` : `#${String(sr.id)}`}</span>
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
                {completing ? 'Completing…' : isPartsSale ? 'Complete sale' : 'Mark complete'}
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

      <div className="card sr-detail__main">
        <div className="sr-detail__main-inner">
          {/* Top row: Details + Assign mechanic */}
          <div className="sr-detail__row">
            <section className="sr-detail__section">
              <h2 className="sr-detail__section-title">Details</h2>
              <dl className="sr-detail__dl">
                <dt>Customer</dt>
                <dd>{lk.customer(sr.customer as number)}</dd>
                {!isPartsSale && (
                  <>
                    <dt>Vehicle</dt>
                    <dd>{lk.vehicle(sr.vehicle as number | null)}</dd>
                  </>
                )}
                <dt>Site</dt>
                <dd>{lk.site(sr.site as number)}</dd>
                <dt>Status</dt>
                <dd>
                  <span className={`badge badge--${String(sr.status || '').toLowerCase().replace(' ', '-')}`}>
                    {String(sr.status || '—')}
                  </span>
                </dd>
                {!isPartsSale && (
                  <>
                    <dt>Service type</dt>
                    <dd>{String(sr.service_type_display || '—')}</dd>
                    <dt>Assigned mechanic</dt>
                    <dd>{lk.mechanic(sr.assigned_mechanic as number | undefined)}</dd>
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
                              const updated = (await serviceRequests.update(sr.id as number, {
                                labor_cost: num,
                              })) as Record<string, unknown>
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
                    formatCurrency(sr.labor_cost as number)
                  )}
                </dd>
                  </>
                )}
              </dl>
              <p className="sr-detail__description">{String(sr.description || '—')}</p>
            </section>

            {!isPartsSale && (
            <section className="sr-detail__section sr-detail__section--mechanic">
              <h2 className="sr-detail__section-title">Assign mechanic</h2>
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
            </section>
            )}
          </div>

          {/* Parts used / Items sold */}
          <section className="sr-detail__section sr-detail__section--parts">
            <h2 className="sr-detail__section-title">{isPartsSale ? 'Items sold' : 'Parts used'}</h2>
            {canEdit && (
              <form className="sr-detail__add-part" onSubmit={handleAddPart}>
                <div className="sr-detail__add-part-search">
                  <ProductSearch
                    key={addProductId ? `sel-${addProductId}` : 'empty'}
                    placeholder={isPartsSale ? 'Search products…' : 'Search by FMSI, position, brand, application…'}
                    onSelect={(p) => {
                      setAddProductId(p ? String(p.id) : '')
                      setAddQty(1)
                    }}
                    onChange={(id) => setAddProductId(id || '')}
                    getAvailable={available}
                    vehicle={vehicleForProductSearch}
                    siteId={sr?.site != null ? Number(sr.site) : null}
                  />
                </div>
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
                  {addingPart ? 'Adding…' : isPartsSale ? 'Add item' : 'Add'}
                </button>
              </form>
            )}
            {usageWithNames.length === 0 ? (
              <p className="sr-detail__muted">{isPartsSale ? 'No items added yet.' : 'No parts added yet.'}</p>
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
                      {canEdit && sr?.status !== 'Completed' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {usageWithNames.map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.productName}
                          {u.sku ? <span className="sr-detail__sku"> ({u.sku})</span> : null}
                        </td>
                        <td>
                          {editingUsageId === u.id ? (
                            <span className="sr-detail__qty-edit">
                              <input
                                type="number"
                                min={1}
                                max={available(u.product) + (u.quantity_used ?? 0)}
                                className="input"
                                value={editingQty}
                                onChange={(e) => setEditingQty(parseInt(e.target.value, 10) || 1)}
                                style={{ width: '60px' }}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="btn btn--sm btn--primary"
                                onClick={handleSavePart}
                                disabled={updatingUsage}
                              >
                                {updatingUsage ? '…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm btn--ghost"
                                onClick={() => setEditingUsageId(null)}
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            u.quantity_used
                          )}
                        </td>
                        <td>{u.unit}</td>
                        <td>{formatCurrency(u.unitPrice)}</td>
                        <td>{formatCurrency(u.lineTotal)}</td>
                        {canEdit && sr?.status !== 'Completed' && (
                          <td>
                            {editingUsageId !== u.id && (
                              <span className="sr-detail__part-actions">
                                <button
                                  type="button"
                                  className="btn btn--sm btn--ghost"
                                  onClick={() => handleEditPart(u)}
                                  aria-label="Edit quantity"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--sm btn--ghost"
                                  onClick={() => handleDeletePart(u.id)}
                                  disabled={deletingUsageId === u.id}
                                  aria-label="Remove part"
                                >
                                  {deletingUsageId === u.id ? '…' : 'Delete'}
                                </button>
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Invoice */}
          {invoiceForSr && (
            <section className="sr-detail__section sr-detail__section--invoice">
              <div className="invoice-card__header">
                <div>
                  <h2 className="invoice-card__title">Invoice #{invoiceForSr.id}</h2>
                  <p className="invoice-card__date">
                    {invoiceForSr.created_at
                      ? new Date(invoiceForSr.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
                <div className="invoice-card__actions">
                  <span className={`invoice-card__badge invoice-card__badge--${invoiceForSr.paid ? 'paid' : 'pending'}`}>
                    {invoiceForSr.paid
                      ? `Paid (${PAYMENT_LABELS[invoiceForSr.payment_method] ?? invoiceForSr.payment_method ?? '—'})`
                      : 'Balance due'}
                  </span>
                  {!invoiceForSr.paid && canWrite && (
                    <span className="invoice-card__mark-paid">
                      <select
                        className="select"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        aria-label="Payment method"
                        style={{ minWidth: '120px', marginRight: '0.5rem' }}
                      >
                        <option value="cash">Cash</option>
                        <option value="momo">MoMo</option>
                        <option value="pos">POS</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={handleMarkPaid}
                        disabled={markingPaid}
                      >
                        {markingPaid ? 'Updating…' : 'Mark as paid'}
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={async () => {
                      setDownloadingPdf(true)
                      try {
                        await invoices.downloadPdf(invoiceForSr.id)
                      } catch (e) {
                        setFormError(apiErrorMsg(e))
                      } finally {
                        setDownloadingPdf(false)
                      }
                    }}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? 'Downloading…' : 'Download PDF'}
                  </button>
                </div>
              </div>
              <div className="invoice-card__body">
                {(usageWithNames.length > 0 || Number(sr.labor_cost ?? 0) > 0) && (
                  <div className="invoice-card__line-items">
                    <table className="invoice-card__table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Unit price</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageWithNames.map((u) => (
                          <tr key={u.id}>
                            <td>{u.productName}{u.sku ? ` (${u.sku})` : ''}</td>
                            <td>{u.quantity_used}</td>
                            <td>{formatCurrency(u.unitPrice)}</td>
                            <td>{formatCurrency(u.lineTotal)}</td>
                          </tr>
                        ))}
                        {Number(sr.labor_cost ?? 0) > 0 && (
                          <tr>
                            <td>Labor / Workmanship</td>
                            <td>1</td>
                            <td>{formatCurrency(Number(sr.labor_cost))}</td>
                            <td>{formatCurrency(Number(sr.labor_cost))}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="invoice-card__totals">
                  {Number(invoiceForSr.discount_amount ?? 0) > 0 && (
                    <div className="invoice-card__total-row">
                      <span>Discount</span>
                      <span>-{formatCurrency(invoiceForSr.discount_amount)}</span>
                    </div>
                  )}
                  <div className="invoice-card__total-row invoice-card__total-row--main">
                    <span>Total due</span>
                    <span>{formatCurrency(invoiceForSr.total_cost)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
