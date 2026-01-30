import { useEffect, useState, useMemo } from 'react'
import { inventory, products, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg, toList } from '../api/client'
import './GenericListPage.css'
import './InventoryPage.css'

const CATEGORY_LABELS = {
  spare_part: 'Spare part',
  accessory: 'Accessory',
  consumable: 'Consumable',
  fluid: 'Fluid',
  other: 'Other',
}

export default function InventoryPage() {
  const { canWrite } = useAuth()
  const [list, setList] = useState([])
  const [prods, setProds] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [siteFilter, setSiteFilter] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [productId, setProductId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [quantity_on_hand, setQuantity_on_hand] = useState('')
  const [reorder_level, setReorder_level] = useState('')
  const [reorder_quantity, setReorder_quantity] = useState('')
  const [bin_location, setBin_location] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([inventory.list(), products.list(), sites.list()])
      .then(([i, p, s]) => {
        setList(toList(i))
        setProds(toList(p))
        setSitesList(toList(s))
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const byId = (arr, id) => (arr || []).find((x) => x.id === id)
  const productName = (id) => (byId(prods, id)?.name ?? `#${id}`)
  const productSku = (id) => byId(prods, id)?.sku
  const productCategory = (id) => CATEGORY_LABELS[byId(prods, id)?.category] || byId(prods, id)?.category || '—'
  const productUnit = (id) => byId(prods, id)?.unit_of_measure ?? 'each'
  const siteName = (id) => (byId(sitesList, id)?.name ?? `#${id}`)

  const filtered = useMemo(() => {
    let rows = toList(list)
    if (siteFilter) rows = rows.filter((r) => String(r.site) === String(siteFilter))
    if (lowStockOnly) {
      rows = rows.filter((r) => {
        const level = r.reorder_level ?? 0
        const onHand = r.quantity_on_hand ?? 0
        return level > 0 && onHand <= level
      })
    }
    return rows
  }, [list, siteFilter, lowStockOnly])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const qty = parseInt(quantity_on_hand, 10)
    const rl = parseInt(reorder_level, 10) || 0
    const rq = parseInt(reorder_quantity, 10) || 0
    if (!productId || !siteId || isNaN(qty) || qty < 0) {
      setFormError('Product, site, and quantity on hand are required.')
      return
    }
    setSubmitting(true)
    try {
      await inventory.create({
        product: parseInt(productId, 10),
        site: parseInt(siteId, 10),
        quantity_on_hand: qty,
        quantity_reserved: 0,
        reorder_level: rl,
        reorder_quantity: rq,
        bin_location: bin_location.trim() || '',
      })
      setProductId('')
      setSiteId('')
      setQuantity_on_hand('')
      setReorder_level('')
      setReorder_quantity('')
      setBin_location('')
      setShowForm(false)
      load()
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="generic-list">
      <div className="page-header">
        <h1 className="page-title">Inventory</h1>
        {canWrite && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
          >
            {showForm ? 'Cancel' : 'Add inventory'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="form-card card" onSubmit={handleSubmit}>
          <h2 className="form-card__title">New inventory record</h2>
          {formError && <div className="form-card__error" role="alert">{formError}</div>}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="inv-product">Product</label>
              <select
                id="inv-product"
                className="select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                <option value="">Select product</option>
                {(prods || []).filter((p) => p.is_active !== false).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.sku ? ` (${p.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="inv-site">Site</label>
              <select
                id="inv-site"
                className="select"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                required
              >
                <option value="">Select site</option>
                {(sitesList || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="inv-qty">Quantity on hand</label>
              <input
                id="inv-qty"
                type="number"
                min={0}
                className="input"
                value={quantity_on_hand}
                onChange={(e) => setQuantity_on_hand(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="inv-reorder-level">Reorder level</label>
              <input
                id="inv-reorder-level"
                type="number"
                min={0}
                className="input"
                value={reorder_level}
                onChange={(e) => setReorder_level(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="inv-reorder-qty">Reorder quantity</label>
              <input
                id="inv-reorder-qty"
                type="number"
                min={0}
                className="input"
                value={reorder_quantity}
                onChange={(e) => setReorder_quantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="inv-bin">Bin location</label>
              <input
                id="inv-bin"
                className="input"
                value={bin_location}
                onChange={(e) => setBin_location(e.target.value)}
                placeholder="e.g. A-12-3"
              />
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

      <div className="inventory-filters">
        <label className="inventory-filters__item">
          <span className="label" style={{ marginRight: '0.5rem', marginBottom: 0 }}>Site</span>
          <select
            className="select"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="">All sites</option>
            {(sitesList || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="inventory-filters__item">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          <span style={{ marginLeft: '0.35rem' }}>Low stock only</span>
        </label>
      </div>

      {error && <div className="generic-list__error">{apiErrorMsg(error)}</div>}
      <div className="card table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            {toList(list).length === 0 ? 'No inventory yet. Use “Add inventory” to create a record.' : 'No records match the filters.'}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Site</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Reorder at</th>
                <th>Bin</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const onHand = r.quantity_on_hand ?? 0
                const reserved = r.quantity_reserved ?? 0
                const available = Math.max(0, onHand - reserved)
                const reorder = r.reorder_level ?? 0
                const low = reorder > 0 && onHand <= reorder
                const sku = productSku(r.product)
                return (
                  <tr key={r.id}>
                    <td>
                      {productName(r.product)}
                      {sku ? <span className="inventory-page__sku"> ({sku})</span> : null}
                    </td>
                    <td>{productCategory(r.product)}</td>
                    <td>{productUnit(r.product)}</td>
                    <td>{siteName(r.site)}</td>
                    <td>{onHand}</td>
                    <td>{reserved}</td>
                    <td>{available}</td>
                    <td>
                      {reorder > 0 ? (
                        <span className={low ? 'badge badge--danger' : ''}>{reorder}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{r.bin_location || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
