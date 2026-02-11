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
import Receipt from '../components/Receipt'
import InvoiceDocument from '../components/InvoiceDocument'
import CompleteSaleModal from '../components/CompleteSaleModal'
import './ServiceRequestDetailPage.css'

function buildLookups(customers, vehicles, sites, mechanics) {
  const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const c = byId(customers)
  const v = byId(vehicles)
  const s = byId(sites)
  const m = byId(mechanics)
  return {
    customer: (id) => (c[id] ? `${c[id].first_name} ${c[id].last_name}` : `#${id}`),
    vehicle: (id) => (!id ? 'Sales' : v[id] ? `${v[id].make} ${v[id].model} (${v[id].license_plate})` : `#${id}`),
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
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [previewMode, setPreviewMode] = useState<'receipt' | 'invoice' | null>(null)
  const [assignMechanicId, setAssignMechanicId] = useState('')
  const [addProductId, setAddProductId] = useState('')
  const [addQty, setAddQty] = useState(1)
  const [resetProductSearch, setResetProductSearch] = useState(0)
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
  const [showCompleteModal, setShowCompleteModal] = useState(false)

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
      sku: p?.sku ?? p?.part_number,
      application: p?.application,
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
      setResetProductSearch((prev) => prev + 1)
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

  const handleCompleteWithModal = async (data: { paymentMethod: string; discountAmount?: number; promotionId?: number }) => {
    if (!sr || sr.status === 'Completed') return
    
    setFormError('')
    setCompleting(true)
    
    const body: Record<string, unknown> = {}
    if (data.promotionId) body.promotion_id = data.promotionId
    if (data.discountAmount && data.discountAmount > 0) body.discount_amount = data.discountAmount
    if (laborCost.trim() && !isNaN(parseFloat(laborCost)) && parseFloat(laborCost) >= 0) {
      body.labor_cost = parseFloat(laborCost)
    }
    
    try {
      // 1. Complete the service request (creates invoice)
      const updated = (await serviceRequests.complete(
        sr.id as number, 
        Object.keys(body).length ? body : undefined
      )) as Record<string, unknown>
      setSr(updated)
      
      // 2. Refresh usage and invoice lists
      const [u, inv] = await Promise.all([
        productUsage.list(sr.id as number), 
        invoices.list()
      ])
      setUsageList(toList(u))
      setInvoiceList(toList(inv))
      
      // 3. Mark invoice as paid immediately
      const invoiceForSr = toList(inv).find((i: any) => i.service_request === sr.id)
      if (invoiceForSr) {
        await invoices.update(invoiceForSr.id, {
          paid: true,
          payment_method: data.paymentMethod,
        })
        
        // 4. Refresh invoice list again to show paid status
        const invFresh = await invoices.list()
        setInvoiceList(toList(invFresh))
      }
      
      setShowCompleteModal(false)
    } catch (e) {
      setFormError(apiErrorMsg(e))
      throw e // Re-throw to show error in modal
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
            {isPartsSale ? '← Sales' : '← Service requests'}
          </Link>
          <span className="sr-detail__id">{isPartsSale ? `Sale ${(sr as { display_number?: string }).display_number || sr.id}` : ((sr as { display_number?: string }).display_number || `#${sr.id}`)}</span>
        </div>
        <div className="sr-detail__actions">
          {canEdit && (
            <button
              type="button"
              className="btn btn--success btn--large"
              onClick={() => setShowCompleteModal(true)}
              disabled={usageWithNames.length === 0}
            >
              {isPartsSale ? '💰 Complete Sale' : '✓ Complete Service'}
            </button>
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
                      GHC
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
                    placeholder={isPartsSale ? 'Search by name, SKU, FMSI, brand, part #…' : 'Search by name, SKU, FMSI, brand, position, application…'}
                    onSelect={(p) => {
                      setAddProductId(p ? String(p.id) : '')
                      setAddQty(1)
                    }}
                    onChange={(id) => setAddProductId(id || '')}
                    getAvailable={available}
                    vehicle={vehicleForProductSearch}
                    siteId={sr?.site != null ? Number(sr.site) : null}
                    resetTrigger={resetProductSearch}
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
                  <h2 className="invoice-card__title">Invoice {(invoiceForSr as { display_number?: string }).display_number || invoiceForSr.id}</h2>
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
                    className="btn btn--secondary btn--sm"
                    onClick={async () => {
                      setDownloadingReceipt(true)
                      try {
                        await invoices.downloadReceipt(invoiceForSr.id)
                      } catch (e) {
                        setFormError(apiErrorMsg(e))
                      } finally {
                        setDownloadingReceipt(false)
                      }
                    }}
                    disabled={downloadingReceipt}
                  >
                    {downloadingReceipt ? '…' : 'Receipt (80mm)'}
                  </button>
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
                    {downloadingPdf ? '…' : 'Invoice (A4)'}
                  </button>
                  <span className="invoice-card__preview">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setPreviewMode(previewMode === 'receipt' ? null : 'receipt')}
                    >
                      {previewMode === 'receipt' ? 'Hide receipt' : 'Preview receipt'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setPreviewMode(previewMode === 'invoice' ? null : 'invoice')}
                    >
                      {previewMode === 'invoice' ? 'Hide invoice' : 'Preview invoice'}
                    </button>
                  </span>
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

              {previewMode && (() => {
                const siteData = sitesList?.find((s) => s.id === sr?.site)
                const cust = customersList?.find((c) => c.id === sr?.customer)
                const custName = cust ? `${cust.first_name} ${cust.last_name}` : '—'
                const veh = sr?.vehicle && vehiclesList?.find((v) => v.id === sr.vehicle)
                const vehicleInfo = veh ? `${veh.make} ${veh.model} (${veh.license_plate})` : 'Sales'
                const dt = invoiceForSr.created_at
                  ? new Date(invoiceForSr.created_at)
                  : new Date()
                const dtStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  + ' - ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                const receiptItems = usageWithNames.map((u) => ({
                  productName: u.productName,
                  sku: u.sku,
                  application: u.application ? u.application.split(',')[0].trim() : undefined,
                  quantity_used: u.quantity_used,
                  unitPrice: u.unitPrice,
                  lineTotal: u.lineTotal,
                }))
                if (previewMode === 'receipt') {
                  return (
                    <div className="invoice-card__preview-wrap">
                      <div className="invoice-card__preview-actions">
                        <button type="button" className="btn btn--sm" onClick={() => window.print()}>
                          Print receipt
                        </button>
                      </div>
                      <div className="receipt-print-area">
                        <Receipt
                          branchName={siteData?.name ?? '—'}
                          address={siteData?.location}
                          phone={siteData?.contact_number}
                          receiptNumber={(invoiceForSr as { display_number?: string }).display_number || invoiceForSr.id}
                          invoiceNumber={(invoiceForSr as { display_number?: string }).display_number || invoiceForSr.id}
                          dateTime={dtStr}
                          terminalId={String(siteData?.id ?? '—')}
                          items={receiptItems}
                          laborCost={Number(sr?.labor_cost ?? 0)}
                          subtotal={Number(invoiceForSr.subtotal ?? 0)}
                          discountAmount={Number(invoiceForSr.discount_amount ?? 0)}
                          total={Number(invoiceForSr.total_cost ?? 0)}
                          paid={!!invoiceForSr.paid}
                          paymentMethod={invoiceForSr.payment_method}
                          paymentLabels={PAYMENT_LABELS}
                        />
                      </div>
                    </div>
                  )
                }
                return (
                  <div className="invoice-card__preview-wrap">
                    <div className="invoice-card__preview-actions">
                      <button type="button" className="btn btn--sm" onClick={() => window.print()}>
                        Print invoice
                      </button>
                    </div>
                    <div className="invoice-print-area">
                      <InvoiceDocument
                        branchName={siteData?.name ?? '—'}
                        address={siteData?.location}
                        phone={siteData?.contact_number}
                        invoiceNumber={(invoiceForSr as { display_number?: string }).display_number || invoiceForSr.id}
                        invoiceDate={dtStr.split(' - ')[0]}
                        dueDate={dtStr.split(' - ')[0]}
                        jobRef={(sr as { display_number?: string })?.display_number || `SR#${sr?.id}`}
                        customerName={custName}
                        customerPhone={cust?.phone_number}
                        customerEmail={cust?.email}
                        vehicleInfo={vehicleInfo}
                        items={receiptItems}
                        laborCost={Number(sr?.labor_cost ?? 0)}
                        subtotal={Number(invoiceForSr.subtotal ?? 0)}
                        discountAmount={Number(invoiceForSr.discount_amount ?? 0)}
                        total={Number(invoiceForSr.total_cost ?? 0)}
                        paid={!!invoiceForSr.paid}
                        paymentMethod={invoiceForSr.payment_method}
                        paymentLabels={PAYMENT_LABELS}
                      />
                    </div>
                  </div>
                )
              })()}
            </section>
          )}
        </div>
      </div>

      {/* Complete Sale Modal */}
      {showCompleteModal && (
        <CompleteSaleModal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          onComplete={handleCompleteWithModal}
          items={usageWithNames}
          laborCost={Number(sr?.labor_cost ?? 0)}
          currentDiscount={parseFloat(manualDiscount) || 0}
          currentPromotion={
            selectedPromotionId 
              ? promotionsList.find((p: any) => p.id === parseInt(selectedPromotionId, 10))
              : undefined
          }
          promotions={promotionsList}
          isPartsSale={isPartsSale}
        />
      )}
    </div>
  )
}
