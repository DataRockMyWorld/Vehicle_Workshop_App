import ProductSearch from '../ProductSearch'
import { formatCurrency } from '../../utils/currency'
import type { UsageWithNames } from '../../hooks/useServiceRequestDetail'
import './ProductUsageSection.css'

interface ProductUsageSectionProps {
  isPartsSale: boolean
  canEdit: boolean
  sr: Record<string, unknown>
  usageWithNames: UsageWithNames[]
  addProductId: string
  setAddProductId: (s: string) => void
  addQty: number
  setAddQty: (n: number) => void
  resetProductSearch: number
  setResetProductSearch: (fn: (n: number) => number) => void
  vehicleForProductSearch: string
  available: (pid: number) => number
  addingPart: boolean
  editingUsageId: number | null
  editingQty: number
  setEditingQty: (n: number) => void
  setEditingUsageId: (n: number | null) => void
  updatingUsage: boolean
  deletingUsageId: number | null
  onAddPart: (e: React.FormEvent) => Promise<void>
  onEditPart: (u: UsageWithNames) => void
  onSavePart: () => Promise<void>
  onDeletePart: (usageId: number) => Promise<void>
}

export default function ProductUsageSection({
  isPartsSale,
  canEdit,
  sr,
  usageWithNames,
  addProductId,
  setAddProductId,
  addQty,
  setAddQty,
  resetProductSearch,
  setResetProductSearch,
  vehicleForProductSearch,
  available,
  addingPart,
  editingUsageId,
  editingQty,
  setEditingQty,
  setEditingUsageId,
  updatingUsage,
  deletingUsageId,
  onAddPart,
  onEditPart,
  onSavePart,
  onDeletePart,
}: ProductUsageSectionProps) {
  return (
    <section className="sr-detail__section sr-detail__section--parts">
      <h2 className="sr-detail__section-title">{isPartsSale ? 'Items sold' : 'Parts used'}</h2>
      {canEdit && (
        <form className="sr-detail__add-part" onSubmit={onAddPart}>
          <div className="sr-detail__add-part-search">
            <ProductSearch
              placeholder={
                isPartsSale
                  ? 'Search by name, SKU, FMSI, brand, part #…'
                  : 'Search by name, SKU, FMSI, brand, position, application…'
              }
              onSelect={(p) => {
                setAddProductId(p ? String(p.id) : '')
                setAddQty(1)
              }}
              onChange={(id) => setAddProductId(id || '')}
              getAvailable={available}
              vehicle={vehicleForProductSearch}
              siteId={sr?.site != null ? Number(sr.site) : null}
              resetTrigger={resetProductSearch}
            />
          </div>
          <input
            type="number"
            min={1}
            max={addProductId ? available(parseInt(addProductId, 10)) : undefined}
            className="input"
            value={addQty}
            onChange={(e) => setAddQty(parseInt(e.target.value, 10) || 1)}
            style={{ width: '80px' }}
          />
          <button type="submit" className="btn btn--secondary" disabled={addingPart || !addProductId}>
            {addingPart ? 'Adding…' : isPartsSale ? 'Add item' : 'Add'}
          </button>
        </form>
      )}
      {usageWithNames.length === 0 ? (
        <p className="sr-detail__muted">{isPartsSale ? 'No items added yet.' : 'No parts added yet.'}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Unit price</th>
                <th>Line total</th>
                {canEdit && sr?.status !== 'Completed' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {usageWithNames.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.productName}
                    {u.sku ? <span className="sr-detail__sku"> ({u.sku})</span> : null}
                  </td>
                  <td>
                    {editingUsageId === u.id ? (
                      <span className="sr-detail__qty-edit">
                        <input
                          type="number"
                          min={1}
                          max={available(u.product) + (u.quantity_used ?? 0)}
                          className="input"
                          value={editingQty}
                          onChange={(e) => setEditingQty(parseInt(e.target.value, 10) || 1)}
                          style={{ width: '60px' }}
                          autoFocus
                        />
                        <button type="button" className="btn btn--sm btn--primary" onClick={onSavePart} disabled={updatingUsage}>
                          {updatingUsage ? '…' : 'Save'}
                        </button>
                        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setEditingUsageId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      u.quantity_used
                    )}
                  </td>
                  <td>{u.unit}</td>
                  <td>{formatCurrency(u.unitPrice)}</td>
                  <td>{formatCurrency(u.lineTotal)}</td>
                  {canEdit && sr?.status !== 'Completed' && (
                    <td>
                      {editingUsageId !== u.id && (
                        <span className="sr-detail__part-actions">
                          <button type="button" className="btn btn--sm btn--ghost" onClick={() => onEditPart(u)} aria-label="Edit quantity">
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--ghost"
                            onClick={() => onDeletePart(u.id)}
                            disabled={deletingUsageId === u.id}
                            aria-label="Remove part"
                          >
                            {deletingUsageId === u.id ? '…' : 'Delete'}
                          </button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
