import { useState, useEffect } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import {
  serviceRequests,
  productUsage,
  invoices,
  customers,
  sites,
  promotions,
} from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import UnsavedChangesModal from '../components/UnsavedChangesModal'
import ProductSearch from '../components/ProductSearch'
import CompleteSaleModal from '../components/CompleteSaleModal'
import { formatCurrency } from '../utils/currency'
import './PartsSaleCreatePage.css'

interface SaleItem {
  productId: number
  productName: string
  sku?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  availableQty: number
}

export default function PartsSaleCreatePage() {
  const navigate = useNavigate()
  const { canWrite, canSeeAllSites, siteId: userSiteId } = useAuth()

  const [customersList, setCustomersList] = useState<{ id: number; first_name: string; last_name: string; email?: string }[]>([])
  const [walkinCustomer, setWalkinCustomer] = useState<{ id: number } | null>(null)
  const [sitesList, setSitesList] = useState<{ id: number; name: string }[]>([])
  const [promotionsList, setPromotionsList] = useState<{ id: number; title: string; discount_percent?: number; discount_amount?: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [quickSale, setQuickSale] = useState(true)
  const [customerId, setCustomerId] = useState('')
  const [siteId, setSiteId] = useState(userSiteId ? String(userSiteId) : '')
  const [items, setItems] = useState<SaleItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [savingDraft, setSavingDraft] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { showWarning, confirmNavigation, cancelNavigation } = useUnsavedChanges(hasUnsavedChanges)

  const effectiveSiteId = canSeeAllSites ? (siteId ? parseInt(siteId, 10) : null) : userSiteId
  const customerIdNum = quickSale ? walkinCustomer?.id : (customerId ? parseInt(customerId, 10) : null)

  useEffect(() => {
    Promise.all([
      customers.list(),
      customers.walkin(),
      sites.list(),
      promotions.active().catch(() => []),
    ])
      .then(([c, walkin, s, prom]) => {
        setCustomersList(toList(c) as { id: number; first_name: string; last_name: string; email?: string }[])
        setWalkinCustomer(walkin as { id: number })
        setSitesList(toList(s) as { id: number; name: string }[])
        setPromotionsList(Array.isArray(prom) ? prom : (toList(prom) as { id: number; title: string; discount_percent?: number; discount_amount?: number }[]))
      })
      .catch((e) => setError(apiErrorMsg(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (userSiteId) setSiteId(String(userSiteId))
  }, [userSiteId])

  const handleAddItem = (product: { id: number; name?: string; sku?: string; unit_price?: number; available_qty?: number }) => {
    if (!product || quantity < 1) return
    const unitPrice = product.unit_price ?? 0
    const existing = items.find((item) => item.productId === product.id)
    if (existing) {
      setItems(
        items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity, lineTotal: (item.quantity + quantity) * item.unitPrice }
            : item
        )
      )
    } else {
      setItems([
        ...items,
        {
          productId: product.id,
          productName: product.name ?? `#${product.id}`,
          sku: product.sku,
          quantity,
          unitPrice,
          lineTotal: quantity * unitPrice,
          availableQty: product.available_qty ?? 0,
        },
      ])
    }
    setSelectedProductId('')
    setQuantity(1)
    setResetTrigger((prev) => prev + 1)
    setHasUnsavedChanges(true)
  }

  const handleRemoveItem = (productId: number) => {
    setItems(items.filter((item) => item.productId !== productId))
    setHasUnsavedChanges(true)
  }

  const handleUpdateQuantity = (productId: number, newQty: number) => {
    if (newQty < 1) {
      handleRemoveItem(productId)
      return
    }
    setItems(
      items.map((item) =>
        item.productId === productId ? { ...item, quantity: newQty, lineTotal: newQty * item.unitPrice } : item
      )
    )
    setHasUnsavedChanges(true)
  }

  const handleSaveDraft = async () => {
    if (!customerIdNum || !effectiveSiteId || items.length === 0) return
    setError(null)
    setSavingDraft(true)
    try {
      const salePayload = {
        customer: customerIdNum,
        site: effectiveSiteId,
        vehicle: null,
        status: 'Draft',
        service_type: null,
        description: 'Sales',
      }
      const sale = (await serviceRequests.create(salePayload)) as { id: number }
      for (const item of items) {
        await productUsage.create({
          service_request: sale.id,
          product: item.productId,
          quantity_used: item.quantity,
        })
      }
      setHasUnsavedChanges(false)
      navigate(`/sales/${sale.id}`)
    } catch (e) {
      setError(apiErrorMsg(e))
    } finally {
      setSavingDraft(false)
    }
  }

  const handleCompleteSale = async (data: { paymentMethod: string; discountAmount?: number; promotionId?: number }) => {
    if (!customerIdNum || !effectiveSiteId || items.length === 0) return
    setError(null)
    try {
      const salePayload = {
        customer: customerIdNum,
        site: effectiveSiteId,
        vehicle: null,
        status: 'Draft',
        service_type: null,
        description: 'Sales',
      }
      const sale = (await serviceRequests.create(salePayload)) as { id: number }
      for (const item of items) {
        await productUsage.create({
          service_request: sale.id,
          product: item.productId,
          quantity_used: item.quantity,
        })
      }
      const completePayload: Record<string, unknown> = {}
      if (data.discountAmount && data.discountAmount > 0) completePayload.discount_amount = data.discountAmount
      if (data.promotionId) completePayload.promotion_id = data.promotionId
      await serviceRequests.complete(sale.id, Object.keys(completePayload).length ? completePayload : undefined)
      const invRes = await invoices.list()
      const invList = toList(invRes) as { id: number; service_request: number }[]
      const invoice = invList.find((inv) => inv.service_request === sale.id)
      if (invoice) {
        await invoices.update(invoice.id, { paid: true, payment_method: data.paymentMethod })
      }
      setHasUnsavedChanges(false)
      setShowCompleteModal(false)
      navigate(`/sales/${sale.id}`)
    } catch (e) {
      setError(apiErrorMsg(e))
      throw e
    }
  }

  if (!canWrite) return <Navigate to="/parts-sale" replace />

  if (loading) {
    return (
      <div className="parts-sale-create">
        <div className="parts-sale-create__header">
          <Link to="/parts-sale" className="parts-sale-create__back">
            ← Back to sales
          </Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)

  return (
    <div className="parts-sale-create">
      <UnsavedChangesModal
        isOpen={showWarning}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
      <div className="parts-sale-create__header">
        <Link to="/parts-sale" className="parts-sale-create__back">
          ← Back to sales
        </Link>
        <h1 className="parts-sale-create__title">New sale</h1>
        <p className="parts-sale-create__subtitle">
          Add items, then complete the sale or save as draft
        </p>
      </div>

      {error && (
        <div className="parts-sale-create__error" role="alert">
          {error}
        </div>
      )}

      <div className="parts-sale-create__card card">
        {/* Customer & site – compact top bar */}
        <div className="parts-sale-create__top">
          <div className="parts-sale-create__customer">
            <span className="parts-sale-create__label">Customer</span>
            <div className="parts-sale-create__customer-options">
              <label className="parts-sale-create__radio">
                <input
                  type="radio"
                  name="customerMode"
                  checked={quickSale}
                  onChange={() => setQuickSale(true)}
                />
                <span>Walk-in</span>
              </label>
              <label className="parts-sale-create__radio">
                <input
                  type="radio"
                  name="customerMode"
                  checked={!quickSale}
                  onChange={() => setQuickSale(false)}
                />
                <span>Registered</span>
              </label>
            </div>
            {!quickSale && (
              <select
                className="select parts-sale-create__select"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                <option value="">Select customer</option>
                {customersList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                    {c.email ? ` — ${c.email}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          {canSeeAllSites && (
            <div className="parts-sale-create__site">
              <span className="parts-sale-create__label">Site</span>
              <select
                className="select parts-sale-create__select"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                required
              >
                <option value="">Select site</option>
                {sitesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Product search */}
        <div className="parts-sale-create__search">
          <div className="parts-sale-create__search-group">
            <label className="parts-sale-create__label">Product</label>
            <ProductSearch
              placeholder="Search or scan product"
              onSelect={handleAddItem}
              siteId={effectiveSiteId}
              resetTrigger={resetTrigger}
            />
          </div>
          <div className="parts-sale-create__qty-group">
            <label className="parts-sale-create__label">Qty</label>
            <input
              type="number"
              min={1}
              className="input parts-sale-create__qty"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>

        {/* Items table */}
        {items.length > 0 ? (
          <div className="parts-sale-create__items">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId}>
                    <td>
                      {item.productName}
                      {item.sku && <span className="text-muted"> ({item.sku})</span>}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={item.availableQty || 999}
                        className="input input--sm"
                        style={{ width: '70px' }}
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(item.productId, parseInt(e.target.value, 10) || 1)
                        }
                      />
                    </td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.lineTotal)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => handleRemoveItem(item.productId)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="parts-sale-create__empty">
            No items added. Search or scan products above to add them.
          </div>
        )}

        {/* Footer: totals + actions */}
        <div className="parts-sale-create__footer">
          <div className="parts-sale-create__totals">
            <div className="parts-sale-create__total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="parts-sale-create__total-row parts-sale-create__total-row--main">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>
          <div className="parts-sale-create__actions">
            <Link to="/parts-sale" className="btn btn--secondary">
              Cancel
            </Link>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleSaveDraft}
              disabled={
                savingDraft ||
                items.length === 0 ||
                !customerIdNum ||
                !effectiveSiteId ||
                (!quickSale && !customerId)
              }
            >
              {savingDraft ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              className="btn btn--success btn--large"
              onClick={() => setShowCompleteModal(true)}
              disabled={
                items.length === 0 ||
                !customerIdNum ||
                !effectiveSiteId ||
                (!quickSale && !customerId)
              }
            >
              💰 Complete sale
            </button>
          </div>
        </div>
      </div>

      {showCompleteModal && (
        <CompleteSaleModal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          onComplete={handleCompleteSale}
          items={items.map((i) => ({
            productName: i.productName,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
          }))}
          laborCost={0}
          promotions={promotionsList}
          isPartsSale={true}
        />
      )}
    </div>
  )
}
