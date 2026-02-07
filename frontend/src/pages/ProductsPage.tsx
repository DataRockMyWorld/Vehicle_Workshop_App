import { useCallback, useEffect, useState, useMemo } from 'react'
import { products, inventory, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg, toList } from '../api/client'
import { formatCurrency } from '../utils/currency'
import { usePagination } from '../hooks/usePagination'
import { useAsyncData } from '../hooks/useAsyncData'
import Pagination from '../components/Pagination'
import PageError from '../components/PageError'
import './GenericListPage.css'
import './ProductsPage.css'

const CATEGORIES = [
  { value: 'spare_part', label: 'Spare part' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'fluid', label: 'Fluid / lubricant' },
  { value: 'other', label: 'Other' },
]

const UNITS = [
  { value: 'each', label: 'Each' },
  { value: 'litre', label: 'Litre' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'metre', label: 'Metre' },
  { value: 'box', label: 'Box' },
  { value: 'set', label: 'Set' },
  { value: 'pair', label: 'Pair' },
]

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))
const UNIT_LABELS = Object.fromEntries(UNITS.map((u) => [u.value, u.label]))

export default function ProductsPage() {
  const { isSuperuser } = useAuth()
  const { data: rawList, loading, error, refetch } = useAsyncData(() => products.list(), [])
  const list = rawList ? toList(rawList) : []
  const load = useCallback(() => refetch(), [refetch])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('spare_part')
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [part_number, setPart_number] = useState('')
  const [unit_price, setUnit_price] = useState('')
  const [cost_price, setCost_price] = useState('')
  const [unit_of_measure, setUnit_of_measure] = useState('each')
  const [is_active, setIs_active] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [stockModalProduct, setStockModalProduct] = useState(null)
  const [sitesList, setSitesList] = useState([])
  const [stockSiteId, setStockSiteId] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [stockReorderLevel, setStockReorderLevel] = useState('')
  const [stockReorderQty, setStockReorderQty] = useState('')
  const [stockBinLocation, setStockBinLocation] = useState('')
  const [stockSubmitting, setStockSubmitting] = useState(false)
  const [stockError, setStockError] = useState('')

  useEffect(() => {
    if (isSuperuser) sites.list().then((r) => setSitesList(toList(r))).catch(() => {})
  }, [isSuperuser])

  const openStockModal = (product) => {
    setStockModalProduct(product)
    setStockSiteId('')
    setStockQty('')
    setStockReorderLevel('')
    setStockReorderQty('')
    setStockBinLocation('')
    setStockError('')
  }

  const closeStockModal = () => {
    setStockModalProduct(null)
    setStockError('')
  }

  const handleStockSubmit = async (e) => {
    e.preventDefault()
    if (!stockModalProduct || !stockSiteId) return
    const qty = parseInt(stockQty, 10)
    if (isNaN(qty) || qty < 0) {
      setStockError('Quantity must be 0 or more.')
      return
    }
    setStockError('')
    setStockSubmitting(true)
    try {
      await inventory.create({
        product: stockModalProduct.id,
        site: parseInt(stockSiteId, 10),
        quantity_on_hand: qty,
        quantity_reserved: 0,
        reorder_level: parseInt(stockReorderLevel, 10) || 0,
        reorder_quantity: parseInt(stockReorderQty, 10) || 0,
        bin_location: stockBinLocation.trim() || '',
      })
      closeStockModal()
    } catch (err) {
      setStockError(apiErrorMsg(err))
    } finally {
      setStockSubmitting(false)
    }
  }

  const filteredList = useMemo(() => {
    if (!searchFilter.trim()) return list
    const q = searchFilter.trim().toLowerCase()
    return list.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.fmsi_number || '').toLowerCase().includes(q) ||
        (p.position || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.application || '').toLowerCase().includes(q) ||
        (p.product_type || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
    )
  }, [list, searchFilter])

  const {
    paginatedItems,
    currentPage,
    totalPages,
    pageSize,
    setPage,
    setPageSize,
  } = usePagination(filteredList, 10)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const price = parseFloat(unit_price)
    const cost = cost_price.trim() ? parseFloat(cost_price) : null
    if (!name.trim() || isNaN(price) || price < 0) {
      setFormError('Name and unit price are required; price must be ≥ 0.')
      return
    }
    if (cost != null && (isNaN(cost) || cost < 0)) {
      setFormError('Cost price must be ≥ 0 when provided.')
      return
    }
    setSubmitting(true)
    try {
      await products.create({
        name: name.trim(),
        sku: sku.trim() || null,
        category,
        description: description.trim() || '',
        brand: brand.trim() || '',
        part_number: part_number.trim() || '',
        unit_price: price,
        cost_price: cost,
        unit_of_measure,
        is_active,
      })
      setName('')
      setSku('')
      setCategory('spare_part')
      setDescription('')
      setBrand('')
      setPart_number('')
      setUnit_price('')
      setCost_price('')
      setUnit_of_measure('each')
      setIs_active(true)
      setShowForm(false)
      load()
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleImportExcel = async (e) => {
    const file = e?.target?.files?.[0]
    if (!file) return
    setFormError('')
    setImportResult(null)
    setImporting(true)
    try {
      const res = await products.importExcel(file)
      setImportResult(res)
      load()
    } catch (err) {
      setFormError(apiErrorMsg(err))
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="generic-list">
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        {isSuperuser && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="btn btn--secondary" style={{ margin: 0, cursor: importing ? 'not-allowed' : 'pointer' }}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                disabled={importing}
                style={{ display: 'none' }}
              />
              {importing ? 'Importing…' : 'Import from Excel'}
            </label>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setShowForm(!showForm)}
              aria-expanded={showForm}
            >
              {showForm ? 'Cancel' : 'Add product'}
            </button>
          </div>
        )}
      </div>

      <div className="products-search-bar" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          className="input"
          placeholder="Search by FMSI, position, brand, application…"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{ maxWidth: '320px' }}
        />
        {searchFilter && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSearchFilter('')}>
            Clear
          </button>
        )}
      </div>

      {importResult && (
        <div className="generic-list__import-result" style={{ padding: '0.75rem 1rem', background: 'var(--accent-muted)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
          Import complete: {importResult.created} created, {importResult.updated} updated.
          {importResult.skipped > 0 && ` ${importResult.skipped} skipped.`}
        </div>
      )}

      {showForm && (
        <form className="form-card card" onSubmit={handleSubmit}>
          <h2 className="form-card__title">New product</h2>
          {formError && <div className="form-card__error" role="alert">{formError}</div>}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="prod-name">Name</label>
              <input
                id="prod-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="prod-sku">SKU</label>
              <input
                id="prod-sku"
                className="input"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="prod-category">Category</label>
              <select
                id="prod-category"
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="prod-unit">Unit</label>
              <select
                id="prod-unit"
                className="select"
                value={unit_of_measure}
                onChange={(e) => setUnit_of_measure(e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="prod-brand">Brand</label>
              <input
                id="prod-brand"
                className="input"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="prod-part">Part number</label>
              <input
                id="prod-part"
                className="input"
                value={part_number}
                onChange={(e) => setPart_number(e.target.value)}
                placeholder="OEM / manufacturer"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="prod-price">Unit price</label>
              <input
                id="prod-price"
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={unit_price}
                onChange={(e) => setUnit_price(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="prod-cost">Cost price</label>
              <input
                id="prod-cost"
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={cost_price}
                onChange={(e) => setCost_price(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="form-group form-group--full">
              <label className="label" htmlFor="prod-desc">Description</label>
              <textarea
                id="prod-desc"
                className="input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-group form-group--check">
              <label className="label">
                <input
                  type="checkbox"
                  checked={is_active}
                  onChange={(e) => setIs_active(e.target.checked)}
                />
                <span style={{ marginLeft: '0.35rem' }}>Active</span>
              </label>
            </div>
          </div>
          <div className="form-card__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <PageError error={error} onRetry={load} />
        </div>
      )}
      {!error && (
      <div className="card table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty">No products yet. Use “Add product” to create one.</div>
        ) : filteredList.length === 0 ? (
          <div className="empty">No products match your search.</div>
        ) : (
          <>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>FMSI</th>
                <th>Product type</th>
                <th>Position</th>
                <th>Application (vehicle models)</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Part #</th>
                <th>Unit</th>
                <th>Unit price</th>
                <th>Cost</th>
                <th>Active</th>
                {isSuperuser && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((r) => (
                <tr key={r.id}>
                  <td title={r.name || ''}>
                    {r.sku || r.part_number || (r.name && r.name.length > 40 ? r.name.slice(0, 40) + '…' : r.name) || '—'}
                  </td>
                  <td>{r.fmsi_number || '—'}</td>
                  <td>{r.product_type || '—'}</td>
                  <td>{r.position || '—'}</td>
                  <td title={r.application || ''}>
                    {(r.application || '—').length > 60 ? `${(r.application || '').slice(0, 60)}…` : (r.application || '—')}
                  </td>
                  <td>{r.sku || '—'}</td>
                  <td>{CATEGORY_LABELS[r.category] || r.category}</td>
                  <td>{r.brand || '—'}</td>
                  <td>{r.part_number || '—'}</td>
                  <td>{UNIT_LABELS[r.unit_of_measure] || r.unit_of_measure}</td>
                  <td>{formatCurrency(r.unit_price)}</td>
                  <td>{r.cost_price != null ? formatCurrency(r.cost_price) : '—'}</td>
                  <td>{r.is_active !== false ? 'Yes' : 'No'}</td>
                  {isSuperuser && (
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm btn--secondary products__stock-btn"
                        onClick={() => openStockModal(r)}
                      >
                        Stock at site
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredList.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
          </>
        )}
      </div>
      )}

      {stockModalProduct && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-modal-title"
          onClick={closeStockModal}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 id="stock-modal-title">Stock at site</h2>
              <button
                type="button"
                className="modal__close"
                onClick={closeStockModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="modal__product-name">
              {stockModalProduct.name}
              {stockModalProduct.fmsi_number && ` (FMSI: ${stockModalProduct.fmsi_number})`}
            </p>
            <form onSubmit={handleStockSubmit} className="modal__form">
              {stockError && (
                <div className="form-card__error" role="alert">{stockError}</div>
              )}
              <div className="modal__grid">
                <div className="form-group">
                  <label className="label" htmlFor="stock-site">Site</label>
                  <select
                    id="stock-site"
                    className="select"
                    value={stockSiteId}
                    onChange={(e) => setStockSiteId(e.target.value)}
                    required
                  >
                    <option value="">Select site</option>
                    {sitesList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="stock-qty">Quantity on hand</label>
                  <input
                    id="stock-qty"
                    type="number"
                    min={0}
                    className="input"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="stock-reorder">Reorder level</label>
                  <input
                    id="stock-reorder"
                    type="number"
                    min={0}
                    className="input"
                    value={stockReorderLevel}
                    onChange={(e) => setStockReorderLevel(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="stock-reorder-qty">Reorder quantity</label>
                  <input
                    id="stock-reorder-qty"
                    type="number"
                    min={0}
                    className="input"
                    value={stockReorderQty}
                    onChange={(e) => setStockReorderQty(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="form-group form-group--full">
                  <label className="label" htmlFor="stock-bin">Bin location</label>
                  <input
                    id="stock-bin"
                    className="input"
                    value={stockBinLocation}
                    onChange={(e) => setStockBinLocation(e.target.value)}
                    placeholder="e.g. A-12-3"
                  />
                </div>
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn--secondary" onClick={closeStockModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={stockSubmitting}>
                  {stockSubmitting ? 'Adding…' : 'Add to inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
