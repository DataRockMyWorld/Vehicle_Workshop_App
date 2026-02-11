import { useState, useEffect } from 'react'
import { formatCurrency } from '../utils/currency'
import './CompleteSaleModal.css'

interface CompleteSaleItem {
  productName: string
  sku?: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface CompleteSaleModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: { paymentMethod: string; discountAmount?: number }) => Promise<void>
  items: CompleteSaleItem[]
  laborCost: number
  currentDiscount?: number
  currentPromotion?: { id: number; title: string; discount_percent?: number; discount_amount?: number }
  promotions: Array<{ id: number; title: string; discount_percent?: number; discount_amount?: number }>
  isPartsSale: boolean
}

export default function CompleteSaleModal({
  isOpen,
  onClose,
  onComplete,
  items,
  laborCost,
  currentDiscount = 0,
  currentPromotion,
  promotions,
  isPartsSale,
}: CompleteSaleModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'pos'>('cash')
  const [amountTendered, setAmountTendered] = useState('')
  const [discount, setDiscount] = useState(currentDiscount.toString())
  const [selectedPromotionId, setSelectedPromotionId] = useState(currentPromotion?.id.toString() || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Reset to current values when opened
      setDiscount(currentDiscount.toString())
      setSelectedPromotionId(currentPromotion?.id.toString() || '')
      setPaymentMethod('cash')
      setAmountTendered('')
      setError('')
    }
  }, [isOpen, currentDiscount, currentPromotion])

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault()
        handleComplete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, paymentMethod, discount, amountTendered, selectedPromotionId, submitting])

  // Calculate totals
  const itemsTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const subtotal = itemsTotal + laborCost
  const discountAmount = parseFloat(discount) || 0
  const total = Math.max(0, subtotal - discountAmount)
  const tendered = parseFloat(amountTendered) || 0
  const change = Math.max(0, tendered - total)

  const handleComplete = async () => {
    if (paymentMethod === 'cash' && tendered < total) {
      setError('Amount tendered must be at least the total amount.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const data: any = { paymentMethod }
      if (discountAmount > 0) {
        data.discountAmount = discountAmount
      }
      if (selectedPromotionId) {
        data.promotionId = parseInt(selectedPromotionId, 10)
      }

      await onComplete(data)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to complete transaction')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const PAYMENT_LABELS = { cash: 'Cash', momo: 'MoMo', pos: 'POS' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--medium complete-sale-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isPartsSale ? 'Complete Sale' : 'Complete Service'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body complete-sale">
          {error && (
            <div className="alert alert--error" role="alert">{error}</div>
          )}

          {/* Items Review */}
          <div className="complete-sale__section">
            <h3 className="complete-sale__section-title">{isPartsSale ? 'Items' : 'Parts & Labor'}</h3>
            <div className="complete-sale__items">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        {item.productName}
                        {item.sku && <span className="text-muted"> ({item.sku})</span>}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                  {laborCost > 0 && (
                    <tr>
                      <td>Labor / Workmanship</td>
                      <td>1</td>
                      <td>{formatCurrency(laborCost)}</td>
                      <td>{formatCurrency(laborCost)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount Section */}
          <div className="complete-sale__section">
            <h3 className="complete-sale__section-title">Discount (Optional)</h3>
            <div className="complete-sale__discount">
              {promotions.length > 0 && (
                <div className="form-group">
                  <label className="label">Promotion</label>
                  <select
                    className="select"
                    value={selectedPromotionId}
                    onChange={(e) => {
                      setSelectedPromotionId(e.target.value)
                      // Clear manual discount if promotion selected
                      if (e.target.value) setDiscount('0')
                    }}
                  >
                    <option value="">No promotion</option>
                    {promotions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                        {p.discount_percent ? ` (${p.discount_percent}% off)` : ''}
                        {p.discount_amount ? ` (GHC ${p.discount_amount} off)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="label">Manual Discount (GHC)</label>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  step={0.01}
                  className="input"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => {
                    setDiscount(e.target.value)
                    // Clear promotion if manual discount entered
                    if (parseFloat(e.target.value) > 0) setSelectedPromotionId('')
                  }}
                  disabled={!!selectedPromotionId}
                />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="complete-sale__totals">
            <div className="complete-sale__total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="complete-sale__total-row complete-sale__total-row--discount">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="complete-sale__total-row complete-sale__total-row--main">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="complete-sale__section">
            <h3 className="complete-sale__section-title">Payment Method</h3>
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

          {/* Cash Payment Details */}
          {paymentMethod === 'cash' && (
            <div className="complete-sale__cash">
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
                <div className="complete-sale__change">
                  <span>Change</span>
                  <span className="complete-sale__change-amount">{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}
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
            disabled={submitting}
          >
            {submitting ? 'Processing…' : `Complete & Mark as Paid (Ctrl+Enter)`}
          </button>
        </div>

        <div className="complete-sale__shortcuts">
          <kbd>Esc</kbd> Cancel • <kbd>Ctrl+Enter</kbd> Complete
        </div>
      </div>
    </div>
  )
}
