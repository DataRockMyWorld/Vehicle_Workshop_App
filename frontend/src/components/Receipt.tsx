/**
 * POS thermal receipt (80mm) – Feeling Autopart.
 * Black & white, monospaced columns, print-optimized.
 */
import { formatCurrency } from '../utils/currency'
import './Receipt.css'

export interface ReceiptLineItem {
  productName: string
  sku?: string
  application?: string
  quantity_used: number
  unitPrice: number
  lineTotal: number
}

export interface ReceiptProps {
  businessName?: string
  branchName: string
  address?: string
  phone?: string
  website?: string
  tin?: string
  receiptNumber: number | string
  invoiceNumber: number | string
  dateTime: string
  cashier?: string
  terminalId?: string
  items: ReceiptLineItem[]
  laborCost?: number
  subtotal: number
  discountAmount?: number
  vatRate?: number
  total: number
  paid: boolean
  paymentMethod?: string
  amountPaid?: number
  change?: number
  paymentLabels?: Record<string, string>
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  momo: 'MoMo',
  pos: 'POS (Card)',
}

export default function Receipt({
  businessName = 'Feeling Autopart',
  branchName,
  address,
  phone,
  website,
  tin,
  receiptNumber,
  invoiceNumber,
  dateTime,
  cashier = '—',
  terminalId = '—',
  items,
  laborCost = 0,
  subtotal,
  discountAmount = 0,
  vatRate = 0,
  total,
  paid,
  paymentMethod,
  amountPaid = total,
  change = 0,
  paymentLabels = PAYMENT_LABELS,
}: ReceiptProps) {
  const methodLabel = paid && paymentMethod
    ? (paymentLabels[paymentMethod] ?? paymentMethod)
    : '—'

  return (
    <div className="receipt" role="region" aria-label="POS receipt">
      <header className="receipt__header">
        <h1 className="receipt__business">{businessName}</h1>
        <p className="receipt__branch">{branchName}</p>
        {address && <p className="receipt__line">{address}</p>}
        {phone && <p className="receipt__line">Tel: {phone}</p>}
        {website && <p className="receipt__line">{website}</p>}
        {tin && <p className="receipt__line">TIN/VAT: {tin}</p>}
      </header>

      <div className="receipt__divider" />

      <section className="receipt__meta">
        <p className="receipt__title">RECEIPT {typeof receiptNumber === 'string' && receiptNumber.startsWith('INV-') ? receiptNumber : `#${receiptNumber}`}</p>
        <p className="receipt__line">Invoice {typeof invoiceNumber === 'string' && invoiceNumber.startsWith('INV-') ? invoiceNumber : `#${invoiceNumber}`} | {dateTime}</p>
        <p className="receipt__line">Cashier: {cashier} | POS: {terminalId}</p>
      </section>

      <div className="receipt__divider" />

      <table className="receipt__table">
        <thead>
          <tr>
            <th className="receipt__th-desc">Description</th>
            <th className="receipt__th-num">Qty</th>
            <th className="receipt__th-num">Price</th>
            <th className="receipt__th-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="receipt__td-desc">
                <span>{item.productName}</span>
                {item.sku && <span className="receipt__sku"> {item.sku}</span>}
                {item.application && (
                  <span className="receipt__compat"> ({item.application})</span>
                )}
              </td>
              <td className="receipt__td-num">{item.quantity_used}</td>
              <td className="receipt__td-num">{item.unitPrice.toFixed(2)}</td>
              <td className="receipt__td-num">{item.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
          {laborCost > 0 && (
            <tr>
              <td className="receipt__td-desc">Labor/Workmanship</td>
              <td className="receipt__td-num">1</td>
              <td className="receipt__td-num">{laborCost.toFixed(2)}</td>
              <td className="receipt__td-num">{laborCost.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="receipt__divider" />

      <section className="receipt__totals">
        <div className="receipt__total-row">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="receipt__total-row">
            <span>Discount:</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        {vatRate > 0 && (
          <div className="receipt__total-row">
            <span>VAT ({vatRate}%):</span>
            <span>{formatCurrency(subtotal * vatRate / 100)}</span>
          </div>
        )}
        <div className="receipt__total-row receipt__total-row--main">
          <span>TOTAL PAYABLE</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="receipt__total-row">
          <span>Payment:</span>
          <span>{methodLabel}</span>
        </div>
        <div className="receipt__total-row">
          <span>Amount paid:</span>
          <span>{paid ? formatCurrency(amountPaid) : '—'}</span>
        </div>
        <div className="receipt__total-row">
          <span>Change/Balance:</span>
          <span>{paid ? formatCurrency(change) : formatCurrency(total)}</span>
        </div>
      </section>

      <div className="receipt__divider" />

      <footer className="receipt__footer">
        <p className="receipt__thanks">Thank you for your purchase</p>
        <p className="receipt__disclaimer">
          Electrical parts not returnable after installation. Keep this receipt for warranty claims.
        </p>
        <p className="receipt__verify">Verify: Invoice {typeof invoiceNumber === 'string' && invoiceNumber.startsWith('INV-') ? invoiceNumber : `#${invoiceNumber}`}</p>
        <p className="receipt__compliance">Tax compliance: This is your proof of purchase.</p>
      </footer>
    </div>
  )
}
