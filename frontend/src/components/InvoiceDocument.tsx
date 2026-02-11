/**
 * A4 invoice – international standard, Feeling Autopart.
 * Print-ready, professional, audit-friendly.
 */
import { formatCurrency } from '../utils/currency'
import './InvoiceDocument.css'

export interface InvoiceLineItem {
  productName: string
  sku?: string
  application?: string
  quantity_used: number
  unitPrice: number
  lineTotal: number
}

export interface InvoiceDocumentProps {
  businessName?: string
  branchName: string
  logoUrl?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  tin?: string
  invoiceNumber: number | string
  invoiceDate: string
  dueDate?: string
  jobRef?: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  vehicleInfo?: string
  items: InvoiceLineItem[]
  laborCost?: number
  subtotal: number
  discountAmount?: number
  vatRate?: number
  total: number
  paid: boolean
  paymentMethod?: string
  paymentLabels?: Record<string, string>
  /** Optional: MoMo number, bank account, etc. Shown instead of "As displayed at branch" */
  bankDetails?: string
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  momo: 'MoMo (Mobile Money)',
  pos: 'POS (Card)',
}

export default function InvoiceDocument({
  businessName = 'Feeling Autopart',
  branchName,
  logoUrl,
  address,
  phone,
  email,
  website,
  tin,
  invoiceNumber,
  invoiceDate,
  dueDate,
  jobRef,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
  vehicleInfo = '—',
  items,
  laborCost = 0,
  subtotal,
  discountAmount = 0,
  vatRate = 0,
  total,
  paid,
  paymentMethod,
  paymentLabels = PAYMENT_LABELS,
  bankDetails,
}: InvoiceDocumentProps) {
  const methodLabel = paid && paymentMethod
    ? (paymentLabels[paymentMethod] ?? paymentMethod)
    : '—'

  return (
    <div className="invoice-doc" role="document" aria-label="Invoice">
      {logoUrl && (
        <div className="invoice-doc__logo-wrap">
          <img src={logoUrl} alt="" className="invoice-doc__logo" />
        </div>
      )}
      <header className="invoice-doc__header">
        <div className="invoice-doc__brand">
          <h1 className="invoice-doc__business">{businessName}</h1>
          <p className="invoice-doc__tagline">Auto Parts & Service</p>
          {address && <p className="invoice-doc__addr">{address}</p>}
          {phone && <p>Tel: {phone}</p>}
          {email && <p>Email: {email}</p>}
          {website && <p>Web: {website}</p>}
          {tin && <p>TIN/VAT ID: {tin}</p>}
        </div>
        <div className="invoice-doc__meta">
          <h2 className="invoice-doc__title">INVOICE</h2>
          <p className="invoice-doc__num">{typeof invoiceNumber === 'string' && invoiceNumber.startsWith('INV-') ? invoiceNumber : `#${invoiceNumber}`}</p>
          <p>Invoice date: {invoiceDate}</p>
          {dueDate && <p>Due date: {dueDate}</p>}
          {jobRef && <p>Job ref: {jobRef}</p>}
        </div>
      </header>

      <div className="invoice-doc__section">
        <div className="invoice-doc__billto">
          <h3>Bill to</h3>
          <p className="invoice-doc__cust-name">{customerName}</p>
          {customerPhone && <p>Phone: {customerPhone}</p>}
          {customerEmail && <p>Email: {customerEmail}</p>}
          {customerAddress && <p>{customerAddress}</p>}
          <p className="invoice-doc__muted">Customer TIN: —</p>
        </div>
        <div className="invoice-doc__vehicle">
          <h3>Vehicle / Job</h3>
          <p>{vehicleInfo}</p>
          <p className="invoice-doc__muted">Branch: {branchName}</p>
        </div>
      </div>

      <table className="invoice-doc__table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Part #</th>
            <th>Vehicle</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>VAT</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>{item.productName}</td>
              <td>{item.sku ?? '—'}</td>
              <td>{item.application ? item.application.split(',')[0].trim().slice(0, 25) : '—'}</td>
              <td className="invoice-doc__num-cell">{item.quantity_used}</td>
              <td className="invoice-doc__num-cell">{formatCurrency(item.unitPrice)}</td>
              <td className="invoice-doc__num-cell">
                {vatRate > 0 ? formatCurrency((item.unitPrice * item.quantity_used * vatRate) / 100) : '—'}
              </td>
              <td className="invoice-doc__num-cell">{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
          {laborCost > 0 && (
            <tr>
              <td>Labor / Workmanship</td>
              <td>—</td>
              <td>—</td>
              <td className="invoice-doc__num-cell">1</td>
              <td className="invoice-doc__num-cell">{formatCurrency(laborCost)}</td>
              <td>—</td>
              <td className="invoice-doc__num-cell">{formatCurrency(laborCost)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="invoice-doc__totals">
        <div className="invoice-doc__total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="invoice-doc__total-row">
            <span>Discount</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        {vatRate > 0 && (
          <div className="invoice-doc__total-row">
            <span>VAT ({vatRate}%)</span>
            <span>{formatCurrency(subtotal * vatRate / 100)}</span>
          </div>
        )}
        <div className="invoice-doc__total-row invoice-doc__total-row--main">
          <span>TOTAL AMOUNT DUE</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="invoice-doc__payment">
        <p><strong>Payment:</strong> {methodLabel}</p>
        <p className="invoice-doc__muted">Terms: Immediate</p>
        <p className="invoice-doc__muted">
          {bankDetails || 'Bank / MoMo details: As displayed at branch'}
        </p>
      </div>

      <footer className="invoice-doc__footer">
        <p className="invoice-doc__notes">
          Notes: Electrical parts not returnable after installation. Warranty per manufacturer. Keep this invoice for records.
        </p>
        <p className={`invoice-doc__status invoice-doc__status--${paid ? 'paid' : 'pending'}`}>
          Status: {paid ? 'PAID' : 'BALANCE DUE'}
        </p>
        <div className="invoice-doc__signature">
          <div>
            <span className="invoice-doc__sig-line">_________________________</span>
            <p>Authorized signature</p>
          </div>
          <div>
            <span className="invoice-doc__sig-line">_________________________</span>
            <p>Company stamp</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
