import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useServiceRequestDetail } from '../hooks/useServiceRequestDetail'
import { apiErrorMsg } from '../api/client'
import Loader from '../components/Loader'
import ProductUsageSection from '../components/TransactionDetail/ProductUsageSection'
import CompleteSaleModal from '../components/CompleteSaleModal'
import Receipt from '../components/Receipt'
import InvoiceDocument from '../components/InvoiceDocument'
import { formatCurrency } from '../utils/currency'
import { invoices } from '../api/services'
import './ServiceRequestDetailPage.css'

export default function SaleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const data = useServiceRequestDetail(id)

  const {
    sr,
    loading,
    error,
    lk,
    usageWithNames,
    invoiceForSr,
    formError,
    setFormError,
    addProductId,
    setAddProductId,
    addQty,
    setAddQty,
    resetProductSearch,
    setResetProductSearch,
    addingPart,
    editingUsageId,
    editingQty,
    setEditingQty,
    setEditingUsageId,
    updatingUsage,
    deletingUsageId,
    paymentMethod,
    setPaymentMethod,
    markingPaid,
    completing,
    showCompleteModal,
    setShowCompleteModal,
    promotionsList,
    selectedPromotionId,
    manualDiscount,
    downloadingPdf,
    setDownloadingPdf,
    downloadingReceipt,
    setDownloadingReceipt,
    previewMode,
    setPreviewMode,
    handleAddPart,
    handleEditPart,
    handleSavePart,
    handleDeletePart,
    handleMarkPaid,
    handleCompleteWithModal,
    available,
    vehicleForProductSearch,
    PAYMENT_LABELS,
    sitesList,
    customersList,
    vehiclesList,
  } = data

  // Redirect service requests to /service-requests/:id
  useEffect(() => {
    if (!sr || !id || loading) return
    if (sr.vehicle) {
      navigate(`/service-requests/${id}`, { replace: true })
    }
  }, [sr, id, loading, navigate])

  if (error) {
    return (
      <div className="sr-detail">
        <div className="page-header">
          <Link to="/parts-sale" className="btn btn--ghost">← Sales</Link>
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
          <Link to="/parts-sale" className="btn btn--ghost">← Sales</Link>
        </div>
        <div className="card">
          <Loader label="Loading…" />
        </div>
      </div>
    )
  }

  const canEdit = sr.status !== 'Completed' && canWrite
  const displayNumber = (sr as { display_number?: string }).display_number || sr.id

  return (
    <div className="sr-detail">
      <div className="page-header">
        <div className="sr-detail__back">
          <Link to="/parts-sale" className="btn btn--ghost">← Sales</Link>
          <span className="sr-detail__id">Sale {displayNumber}</span>
        </div>
        <div className="sr-detail__actions">
          {canEdit && (
            <button
              type="button"
              className="btn btn--success btn--large"
              onClick={() => setShowCompleteModal(true)}
              disabled={usageWithNames.length === 0}
            >
              💰 Complete Sale
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
          <div className="sr-detail__row">
            <section className="sr-detail__section">
              <h2 className="sr-detail__section-title">Details</h2>
              <dl className="sr-detail__dl">
                <dt>Customer</dt>
                <dd>{lk.customer(sr.customer as number)}</dd>
                <dt>Site</dt>
                <dd>{lk.site(sr.site as number)}</dd>
                <dt>Status</dt>
                <dd>
                  <span className={`badge badge--${String(sr.status || '').toLowerCase().replace(' ', '-')}`}>
                    {String(sr.status || '—')}
                  </span>
                </dd>
              </dl>
              <p className="sr-detail__description">{String(sr.description || '—')}</p>
            </section>
          </div>

          <ProductUsageSection
            isPartsSale={true}
            canEdit={canEdit}
            sr={sr}
            usageWithNames={usageWithNames}
            addProductId={addProductId}
            setAddProductId={setAddProductId}
            addQty={addQty}
            setAddQty={setAddQty}
            resetProductSearch={resetProductSearch}
            setResetProductSearch={setResetProductSearch}
            vehicleForProductSearch={vehicleForProductSearch}
            available={available}
            addingPart={addingPart}
            editingUsageId={editingUsageId}
            editingQty={editingQty}
            setEditingQty={setEditingQty}
            setEditingUsageId={setEditingUsageId}
            updatingUsage={updatingUsage}
            deletingUsageId={deletingUsageId}
            onAddPart={handleAddPart}
            onEditPart={handleEditPart}
            onSavePart={handleSavePart}
            onDeletePart={handleDeletePart}
          />

          {invoiceForSr && (
            <section className="sr-detail__section sr-detail__section--invoice">
              <div className="invoice-card__header">
                <div>
                  <h2 className="invoice-card__title">
                    Invoice {(invoiceForSr as { display_number?: string }).display_number || invoiceForSr.id}
                  </h2>
                  <p className="invoice-card__date">
                    {invoiceForSr.created_at
                      ? new Date(invoiceForSr.created_at as string).toLocaleDateString('en-GB', {
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
                      ? `Paid (${PAYMENT_LABELS[invoiceForSr.payment_method as string] ?? invoiceForSr.payment_method ?? '—'})`
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
                      <button type="button" className="btn btn--primary btn--sm" onClick={handleMarkPaid} disabled={markingPaid}>
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
                        await invoices.downloadReceipt(invoiceForSr.id as number)
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
                        await invoices.downloadPdf(invoiceForSr.id as number)
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
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="invoice-card__totals">
                  {Number(invoiceForSr.discount_amount ?? 0) > 0 && (
                    <div className="invoice-card__total-row">
                      <span>Discount</span>
                      <span>-{formatCurrency(invoiceForSr.discount_amount as number)}</span>
                    </div>
                  )}
                  <div className="invoice-card__total-row invoice-card__total-row--main">
                    <span>Total due</span>
                    <span>{formatCurrency(invoiceForSr.total_cost as number)}</span>
                  </div>
                </div>
              </div>

              {previewMode && (() => {
                const siteData = (sitesList as { id: number; name?: string; location?: string; contact_number?: string }[]).find((s) => s.id === sr?.site)
                const cust = (customersList as { id: number; first_name: string; last_name: string; phone_number?: string; email?: string }[]).find((c) => c.id === sr?.customer)
                const custName = cust ? `${cust.first_name} ${cust.last_name}` : '—'
                const dt = invoiceForSr.created_at ? new Date(invoiceForSr.created_at as string) : new Date()
                const dtStr =
                  dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
                  ' - ' +
                  dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
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
                          receiptNumber={(invoiceForSr as { display_number?: string }).display_number || String(invoiceForSr.id)}
                          invoiceNumber={(invoiceForSr as { display_number?: string }).display_number || String(invoiceForSr.id)}
                          dateTime={dtStr}
                          terminalId={String(siteData?.id ?? '—')}
                          items={receiptItems}
                          laborCost={0}
                          subtotal={Number(invoiceForSr.subtotal ?? 0)}
                          discountAmount={Number(invoiceForSr.discount_amount ?? 0)}
                          total={Number(invoiceForSr.total_cost ?? 0)}
                          paid={!!invoiceForSr.paid}
                          paymentMethod={invoiceForSr.payment_method as string}
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
                        invoiceNumber={(invoiceForSr as { display_number?: string }).display_number || String(invoiceForSr.id)}
                        invoiceDate={dtStr.split(' - ')[0]}
                        dueDate={dtStr.split(' - ')[0]}
                        jobRef={(sr as { display_number?: string })?.display_number || `Sale#${sr?.id}`}
                        customerName={custName}
                        customerPhone={cust?.phone_number}
                        customerEmail={cust?.email}
                        vehicleInfo="Sales"
                        items={receiptItems}
                        laborCost={0}
                        subtotal={Number(invoiceForSr.subtotal ?? 0)}
                        discountAmount={Number(invoiceForSr.discount_amount ?? 0)}
                        total={Number(invoiceForSr.total_cost ?? 0)}
                        paid={!!invoiceForSr.paid}
                        paymentMethod={invoiceForSr.payment_method as string}
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

      {showCompleteModal && (
        <CompleteSaleModal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          onComplete={handleCompleteWithModal}
          items={usageWithNames}
          laborCost={0}
          currentDiscount={parseFloat(manualDiscount) || 0}
          currentPromotion={
            selectedPromotionId
              ? (promotionsList as { id: number; title: string; discount_percent?: number; discount_amount?: number }[]).find(
                  (p) => p.id === parseInt(selectedPromotionId, 10)
                )
              : undefined
          }
          promotions={promotionsList as { id: number; title: string; discount_percent?: number; discount_amount?: number }[]}
          isPartsSale={true}
        />
      )}
    </div>
  )
}
