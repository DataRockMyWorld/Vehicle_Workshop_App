import { useEffect, useState } from 'react'
import { products } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg, toList } from '../api/client'
import { formatCurrency } from '../utils/currency'
import './GenericListPage.css'

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
  const { canWrite } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  const load = () => {
    setLoading(true)
    products
      .list()
      .then((r) => setList(toList(r)))
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

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

  return (
    <div className="generic-list">
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        {canWrite && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
          >
            {showForm ? 'Cancel' : 'Add product'}
          </button>
        )}
      </div>

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

      {error && <div className="generic-list__error">{apiErrorMsg(error)}</div>}
      <div className="card table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty">No products yet. Use “Add product” to create one.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Part #</th>
                <th>Unit</th>
                <th>Unit price</th>
                <th>Cost</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.sku || '—'}</td>
                  <td>{CATEGORY_LABELS[r.category] || r.category}</td>
                  <td>{r.brand || '—'}</td>
                  <td>{r.part_number || '—'}</td>
                  <td>{UNIT_LABELS[r.unit_of_measure] || r.unit_of_measure}</td>
                  <td>{formatCurrency(r.unit_price)}</td>
                  <td>{r.cost_price != null ? formatCurrency(r.cost_price) : '—'}</td>
                  <td>{r.is_active !== false ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
