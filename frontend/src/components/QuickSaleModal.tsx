import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { serviceRequests, productUsage, invoices } from '../api/services'
import { apiErrorMsg } from '../api/client'
import ProductSearch from './ProductSearch'
import { formatCurrency } from '../utils/currency'
import './QuickSaleModal.css'

interface QuickSaleItem {
  productId: number
  productName: string
  sku?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  availableQty: number
}

interface QuickSaleModalProps {
  isOpen: boolean
  onClose: () => void
  walkinCustomerId: number
  siteId: number
}

export default function QuickSaleModal({ isOpen, onClose, walkinCustomerId, siteId }: QuickSaleModalProps) {
  const navigate = useNavigate()
  const [items, setItems] = useState<QuickSaleItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'pos'>('cash')
  const [amountTendered, setAmountTendered] = useState('')
  const [discount, setDiscount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [resetTrigger, setResetTrigger] = useState(0)
  const productSearchRef = useRef<any>(null)

  useEffect(() => {
    if (isOpen) {
      // Reset state when opened
      setItems([])
      setSelectedProductId('')
      setQuantity(1)
      setPaymentMethod('cash')
      setAmountTendered('')
      setDiscount('')
      setError('')
      
      // Focus product search on open
      setTimeout(() => productSearchRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault()
        handleComplete()
      } else if (e.key === 'F2') {
        e.preventDefault()
        productSearchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, items, paymentMethod, discount, amountTendered])

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const discountAmount = parseFloat(discount) || 0
  const total = Math.max(0, subtotal - discountAmount)
  const tendered = parseFloat(amountTendered) || 0
  const change = Math.max(0, tendered - total)

  const handleAddItem = (product: any) => {
    if (!product || quantity < 1) return
    
    const existing = items.find(item => item.productId === product.id)
    if (existing) {
      // Update quantity
      setItems(items.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + quantity, lineTotal: (item.quantity + quantity) * item.unitPrice }
          : item
      ))
    } else {
      // Add new item
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice: product.unit_price || 0,
        lineTotal: quantity * (product.unit_price || 0),
        availableQty: product.available_qty || 0,
      }])
    }
    
    setSelectedProductId('')
    setQuantity(1)
    setResetTrigger(prev => prev + 1)
    setTimeout(() => productSearchRef.current?.focus(), 100)
  }

  const handleRemoveItem = (productId: number) => {
    setItems(items.filter(item => item.productId !== productId))
  }

  const handleUpdateQuantity = (productId: number, newQty: number) => {
    if (newQty < 1) {
      handleRemoveItem(productId)
      return
    }
    
    setItems(items.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQty, lineTotal: newQty * item.unitPrice }
        : item
    ))
  }

  const handleComplete = async () => {
    if (items.length === 0) {
      setError('Add at least one item to complete the sale.')
      return
    }
    
    if (paymentMethod === 'cash' && tendered < total) {
      setError('Amount tendered must be at least the total amount.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      // 1. Create service request (sale) with Draft status
      const salePayload = {
        customer: walkinCustomerId,
        site: siteId,
        vehicle: null,
        status: 'Draft',
        service_type: null,
        description: 'Quick Sale',
      }
      const sale = await serviceRequests.create(salePayload) as { id: number }

      // 2. Add all items
      for (const item of items) {
        await productUsage.create({
          service_request: sale.id,
          product: item.productId,
          quantity_used: item.quantity,
        })
      }

      // 3. Complete the sale (adjusts inventory, creates invoice)
      const completePayload: any = {}
      if (discountAmount > 0) {
        completePayload.discount_amount = discountAmount
      }
      await serviceRequests.complete(sale.id, completePayload)

      // 4. Mark invoice as paid
      const invoiceList = await invoices.list() as any
      const invoice = invoiceList.results?.find((inv: any) => inv.service_request === sale.id)
      if (invoice) {
        await invoices.update(invoice.id, {
          paid: true,
          payment_method: paymentMethod,
        })
      }

      // 5. Navigate to sale detail (for receipt printing)
      navigate(`/service-requests/${sale.id}`)
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to complete sale')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large quick-sale-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Quick Sale</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body quick-sale">
          {error && (
            <div className="alert alert--error" role="alert">{error}</div>
          )}

          {/* Product Search */}
          <div className="quick-sale__search">
            <ProductSearch
              ref={productSearchRef}
              placeholder="Scan barcode or search product (F2)"
              onSelect={handleAddItem}
              siteId={siteId}
              resetTrigger={resetTrigger}
            />
            <input
              type="number"
              min={1}
              className="input quick-sale__qty"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="Qty"
            />
          </div>

          {/* Items List */}
          {items.length > 0 ? (
            <div className="quick-sale__items">
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
                          max={item.availableQty}
                          className="input input--sm"
                          style={{ width: '70px' }}
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value) || 1)}
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
            <div className="quick-sale__empty">
              No items added. Search or scan products to add them to the sale.
            </div>
          )}

          {/* Totals & Payment */}
          <div className="quick-sale__footer">
            <div className="quick-sale__totals">
              <div className="quick-sale__total-row">
                <span>Subtotal</span>
                <span className="quick-sale__amount">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="quick-sale__total-row">
                <span>Discount</span>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  step={0.01}
                  className="input input--sm"
                  style={{ width: '120px', textAlign: 'right' }}
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="quick-sale__total-row quick-sale__total-row--main">
                <span>Total</span>
                <span className="quick-sale__amount quick-sale__amount--large">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div className="quick-sale__payment">
              <div className="quick-sale__payment-method">
                <label className="label">Payment Method</label>
                <div className="button-group">
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'cash' ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'momo' ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={() => setPaymentMethod('momo')}
                  >
                    MoMo
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'pos' ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={() => setPaymentMethod('pos')}
                  >
                    POS
                  </button>
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div className="quick-sale__cash">
                  <div className="form-group">
                    <label className="label">Amount Tendered</label>
                    <input
                      type="number"
                      min={total}
                      step={0.01}
                      className="input"
                      placeholder={total.toFixed(2)}
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {tendered > 0 && (
                    <div className="quick-sale__change">
                      <span>Change</span>
                      <span className="quick-sale__change-amount">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            className="btn btn--success btn--large"
            onClick={handleComplete}
            disabled={submitting || items.length === 0}
          >
            {submitting ? 'Processing…' : `Complete & Print (Ctrl+Enter)`}
          </button>
        </div>

        <div className="quick-sale__shortcuts">
          <kbd>F2</kbd> Focus search • <kbd>Esc</kbd> Cancel • <kbd>Ctrl+Enter</kbd> Complete
        </div>
      </div>
    </div>
  )
}
