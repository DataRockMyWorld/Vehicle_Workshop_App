import { useCallback, useEffect, useMemo, useState } from 'react'
import { inventory, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import UnsavedChangesModal from '../components/UnsavedChangesModal'
import { apiErrorMsg, toList } from '../api/client'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useAsyncData } from '../hooks/useAsyncData'
import { useDebounce } from '../hooks/useDebounce'
import Pagination from '../components/Pagination'
import ProductSearch from '../components/ProductSearch'
import PageError from '../components/PageError'
import type { InventoryItem, Site } from '../types'
import './GenericListPage.css'
import './InventoryPage.css'

const CATEGORY_LABELS: Record<string, string> = {
  spare_part: 'Spare part',
  accessory: 'Accessory',
  consumable: 'Consumable',
  fluid: 'Fluid',
  other: 'Other',
}

export interface InventoryListItem extends InventoryItem {
  product_name?: string
  product_sku?: string
  product_category?: string
  product_unit?: string
  product_fmsi?: string
  product_brand?: string
  product_part_number?: string
  site_name?: string
}

const STOCK_STATUS_OPTIONS = [
  { value: 'all', label: 'All stock' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
]

const ORDER_OPTIONS = [
  { value: 'product', label: 'Product A–Z' },
  { value: '-product', label: 'Product Z–A' },
  { value: 'qty_desc', label: 'Quantity (high first)' },
  { value: 'qty_asc', label: 'Quantity (low first)' },
  { value: 'reorder_desc', label: 'Reorder level (high first)' },
  { value: 'reorder_asc', label: 'Reorder level (low first)' },
  { value: 'bin', label: 'Bin location A–Z' },
]

export default function InventoryPage() {
  const { canWrite, canSeeAllSites, siteId: userSiteId } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [siteFilter, setSiteFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [productTypeFilter, setProductTypeFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [binFilter, setBinFilter] = useState('')
  const [stockStatusFilter, setStockStatusFilter] = useState('all')
  const [ordering, setOrdering] = useState('product')

  const listParams = useMemo(
    () => ({
      site_id: siteFilter || undefined,
      q: debouncedSearch || undefined,
      category: categoryFilter || undefined,
      product_type: productTypeFilter || undefined,
      position: positionFilter || undefined,
      brand: brandFilter || undefined,
      bin_location: binFilter || undefined,
      stock_status: stockStatusFilter !== 'all' ? stockStatusFilter : undefined,
      ordering,
    }),
    [
      siteFilter,
      debouncedSearch,
      categoryFilter,
      productTypeFilter,
      positionFilter,
      brandFilter,
      binFilter,
      stockStatusFilter,
      ordering,
    ]
  )

  const { items: list, count, loading, error, page, setPage, totalPages, pageSize, refetch } =
    usePaginatedList<InventoryListItem>(
      (p) => inventory.list({ page: p, ...listParams }),
      [listParams]
    )

  const { data: sitesList } = useAsyncData(() => sites.list(undefined, 500), [])
  const sitesArr = (sitesList ? toList(sitesList) : []) as Site[]

  const { data: filterOptions } = useAsyncData(
    () => inventory.filterOptions(siteFilter || userSiteId || undefined),
    [siteFilter, userSiteId]
  )

  const load = useCallback(() => refetch(), [refetch])

  useEffect(() => {
    if (userSiteId) setSiteFilter(String(userSiteId))
  }, [userSiteId])

  const hasActiveFilters =
    debouncedSearch ||
    categoryFilter ||
    productTypeFilter ||
    positionFilter ||
    brandFilter ||
    binFilter ||
    stockStatusFilter !== 'all'

  const clearFilters = () => {
    setSearchInput('')
    setCategoryFilter('')
    setProductTypeFilter('')
    setPositionFilter('')
    setBrandFilter('')
    setBinFilter('')
    setStockStatusFilter('all')
    setOrdering('product')
  }

  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [productId, setProductId] = useState('')
  const [siteId, setSiteId] = useState(userSiteId ? String(userSiteId) : '')
  const [quantity_on_hand, setQuantity_on_hand] = useState('')
  const [reorder_level, setReorder_level] = useState('')
  const [reorder_quantity, setReorder_quantity] = useState('')
  const [bin_location, setBin_location] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { showWarning, confirmNavigation, cancelNavigation } = useUnsavedChanges(hasUnsavedChanges)

  useEffect(() => {
    if (userSiteId) setSiteId(String(userSiteId))
  }, [userSiteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const qty = parseInt(quantity_on_hand, 10)
    const rl = parseInt(reorder_level, 10) || 0
    const rq = parseInt(reorder_quantity, 10) || 0
    const formSiteId = canSeeAllSites ? (siteId ? parseInt(siteId, 10) : null) : userSiteId
    if (!productId || isNaN(qty) || qty < 0) {
      setFormError('Product and quantity on hand are required.')
      return
    }
    if (!formSiteId) {
      setFormError(canSeeAllSites ? 'Please select a site.' : 'No site assigned. Contact your administrator.')
      return
    }
    setSubmitting(true)
    try {
      await inventory.create({
        product: parseInt(productId, 10),
        site: formSiteId,
        quantity_on_hand: qty,
        quantity_reserved: 0,
        reorder_level: rl,
        reorder_quantity: rq,
        bin_location: bin_location.trim() || '',
      })
      setProductId('')
      setSiteId(userSiteId ? String(userSiteId) : '')
      setQuantity_on_hand('')
      setReorder_level('')
      setReorder_quantity('')
      setBin_location('')
      setHasUnsavedChanges(false)
      setShowForm(false)
      load()
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  const lowStockCount = useMemo(
    () => list.filter((r) => (r.reorder_level ?? 0) > 0 && (r.quantity_on_hand ?? 0) <= (r.reorder_level ?? 0)).length,
    [list]
  )

  const formatCategory = (cat: string | undefined) =>
    cat ? CATEGORY_LABELS[cat] || cat : '—'

  return (
    <div className="generic-list inventory-page">
      <UnsavedChangesModal
        isOpen={showWarning}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
      <div className="page-header">
        <h1 className="page-title">Inventory</h1>
        {canWrite && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { if (showForm) setHasUnsavedChanges(false); setShowForm(!showForm); }}
            aria-expanded={showForm}
          >
            {showForm ? 'Cancel' : 'Add inventory'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="form-card card" onSubmit={handleSubmit} onChange={() => setHasUnsavedChanges(true)}>
          <h2 className="form-card__title">New inventory record</h2>
          {formError && (
            <div className="form-card__error" role="alert">
              {formError}
            </div>
          )}
          <div className="form-card__grid">
            <div className="form-group form-group--full">
              <label className="label">Product</label>
              <ProductSearch
                placeholder="Search by FMSI, position, brand, application…"
                onSelect={(p) => setProductId(p ? String(p.id) : '')}
                onChange={(id) => setProductId(id || '')}
              />
            </div>
            {canSeeAllSites && (
              <div className="form-group">
                <label className="label">Site</label>
                <select
                  id="inv-site"
                  className="select"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  required
                >
                  <option value="">Select site</option>
                  {sitesArr.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="label" htmlFor="inv-qty">
                Quantity on hand
              </label>
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
              <label className="label" htmlFor="inv-reorder-level">
                Reorder level
              </label>
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
              <label className="label" htmlFor="inv-reorder-qty">
                Reorder quantity
              </label>
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
              <label className="label" htmlFor="inv-bin">
                Bin location
              </label>
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
            <button type="button" className="btn btn--secondary" onClick={() => { setHasUnsavedChanges(false); setShowForm(false); }}>
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
        <>
          <div className="inventory-toolbar">
            <div className="inventory-search">
              <label htmlFor="inv-search" className="inventory-search__label">
                Search
              </label>
              <input
                id="inv-search"
                type="search"
                className="input inventory-search__input"
                placeholder="Name, SKU, FMSI, part #, brand, application, bin…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoComplete="off"
                aria-label="Search inventory"
              />
            </div>

            <div className="inventory-filters">
              {canSeeAllSites && (
                <label className="inventory-filters__item">
                  <span className="label">Site</span>
                  <select
                    className="select"
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                    aria-label="Filter by site"
                  >
                    <option value="">All sites</option>
                    {sitesArr.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="inventory-filters__item">
                <span className="label">Category</span>
                <select
                  className="select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="">All</option>
                  {(filterOptions?.categories ?? []).map((c) => (
                    <option key={c} value={c}>
                      {formatCategory(c)}
                    </option>
                  ))}
                  {(!filterOptions?.categories?.length || filterOptions.categories.length === 0) && (
                    <>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </label>

              <label className="inventory-filters__item">
                <span className="label">Product type</span>
                <select
                  className="select"
                  value={productTypeFilter}
                  onChange={(e) => setProductTypeFilter(e.target.value)}
                  aria-label="Filter by product type"
                >
                  <option value="">All</option>
                  {(filterOptions?.product_types ?? []).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-filters__item">
                <span className="label">Position</span>
                <select
                  className="select"
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  aria-label="Filter by position"
                >
                  <option value="">All</option>
                  {(filterOptions?.positions ?? []).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-filters__item">
                <span className="label">Brand</span>
                <select
                  className="select"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  aria-label="Filter by brand"
                >
                  <option value="">All</option>
                  {(filterOptions?.brands ?? []).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-filters__item">
                <span className="label">Stock status</span>
                <select
                  className="select"
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                  aria-label="Filter by stock status"
                >
                  {STOCK_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-filters__item">
                <span className="label">Bin</span>
                <input
                  type="text"
                  className="input inventory-filters__bin-input"
                  placeholder="Bin location"
                  value={binFilter}
                  onChange={(e) => setBinFilter(e.target.value)}
                  aria-label="Filter by bin location"
                />
              </label>

              <label className="inventory-filters__item">
                <span className="label">Sort</span>
                <select
                  className="select"
                  value={ordering}
                  onChange={(e) => setOrdering(e.target.value)}
                  aria-label="Sort by"
                >
                  {ORDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn--ghost inventory-filters__clear"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="inventory-summary">
            <span className="inventory-summary__count">
              {count} item{count !== 1 ? 's' : ''}
            </span>
            {lowStockCount > 0 && (
              <span className="inventory-summary__low">
                {lowStockCount} low stock on this page
              </span>
            )}
          </div>

          <div className="card table-wrap">
            {loading ? (
              <div className="empty">Loading…</div>
            ) : list.length === 0 ? (
              <div className="empty">
                {!hasActiveFilters && !siteFilter
                  ? 'No inventory yet. Use “Add inventory” to create a record.'
                  : 'No records match your search or filters. Try adjusting them.'}
              </div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>SKU / FMSI</th>
                      <th>Unit</th>
                      {canSeeAllSites && <th>Site</th>}
                      <th>On hand</th>
                      <th>Reserved</th>
                      <th>Available</th>
                      <th>Reorder at</th>
                      <th>Bin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => {
                      const onHand = r.quantity_on_hand ?? 0
                      const reserved = r.quantity_reserved ?? 0
                      const available = Math.max(0, onHand - reserved)
                      const reorder = r.reorder_level ?? 0
                      const low = reorder > 0 && onHand <= reorder
                      const outOfStock = onHand === 0
                      const inStock = onHand > 0 && (reorder === 0 || onHand > reorder)
                      const qtyStatus = outOfStock ? 'out-of-stock' : low ? 'low' : inStock ? 'in-stock' : ''
                      const name = r.product_name ?? `#${r.product}`
                      const sku = r.product_sku
                      const fmsi = r.product_fmsi
                      const skuFmsi = [sku, fmsi].filter(Boolean).join(' / ') || '—'
                      const cat = formatCategory(r.product_category)
                      const unit = r.product_unit ?? 'each'
                      const siteNameVal = r.site_name ?? `#${r.site}`
                      return (
                        <tr key={r.id}>
                          <td>
                            <span className="inventory-product-name">{name}</span>
                            {r.product_brand && (
                              <span className="inventory-product-brand">{r.product_brand}</span>
                            )}
                          </td>
                          <td>{cat}</td>
                          <td className="inventory-page__sku-cell">{skuFmsi}</td>
                          <td>{unit}</td>
                          {canSeeAllSites && <td>{siteNameVal}</td>}
                          <td className={qtyStatus ? `inventory-qty inventory-qty--${qtyStatus}` : ''}>
                            {onHand}
                          </td>
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
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={count}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  pageSizeOptions={[]}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
