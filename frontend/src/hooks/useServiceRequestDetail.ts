import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  serviceRequests,
  customers,
  vehicles,
  sites,
  mechanics,
  products,
  inventory,
  productUsage,
  invoices,
  promotions,
} from '../api/services'
import { apiErrorMsg, toList } from '../api/client'

function buildLookups(
  customersList: unknown[],
  vehiclesList: unknown[],
  sitesList: unknown[],
  mechanicsList: unknown[]
) {
  const byId = (arr: unknown[]) => Object.fromEntries((arr || []).map((x: { id: number }) => [x.id, x]))
  const c = byId(customersList as { id: number }[])
  const v = byId(vehiclesList as { id: number }[])
  const s = byId(sitesList as { id: number }[])
  const m = byId(mechanicsList as { id: number }[])
  return {
    customer: (id: number) =>
      c[id] ? `${(c[id] as { first_name: string; last_name: string }).first_name} ${(c[id] as { first_name: string; last_name: string }).last_name}` : `#${id}`,
    vehicle: (id: number | null) =>
      !id ? 'Sales' : v[id] ? `${(v[id] as { make: string; model: string; license_plate: string }).make} ${(v[id] as { make: string; model: string; license_plate: string }).model} (${(v[id] as { license_plate: string }).license_plate})` : `#${id}`,
    site: (id: number) => (s[id] ? (s[id] as { name: string }).name : `#${id}`),
    mechanic: (id: number | undefined) => (m[id] ? (m[id] as { name: string }).name : id ? `#${id}` : '—'),
  }
}

export interface UsageWithNames {
  id: number
  product: number
  productName: string
  sku?: string
  application?: string
  unit: string
  unitPrice: number
  lineTotal: number
  quantity_used: number
}

export interface UseServiceRequestDetailResult {
  sr: Record<string, unknown> | null
  loading: boolean
  error: unknown
  lk: ReturnType<typeof buildLookups>
  usageWithNames: UsageWithNames[]
  invoiceForSr: Record<string, unknown> | undefined
  siteMechanics: unknown[]
  productById: Record<number, unknown>
  formError: string
  setFormError: (s: string) => void
  addProductId: string
  setAddProductId: (s: string) => void
  addQty: number
  setAddQty: (n: number) => void
  resetProductSearch: number
  setResetProductSearch: (fn: (n: number) => number) => void
  addingPart: boolean
  editingUsageId: number | null
  editingQty: number
  setEditingQty: (n: number) => void
  setEditingUsageId: (n: number | null) => void
  updatingUsage: boolean
  deletingUsageId: number | null
  assignMechanicId: string
  setAssignMechanicId: (s: string) => void
  assigning: boolean
  laborCost: string
  setLaborCost: (s: string) => void
  paymentMethod: string
  setPaymentMethod: (s: string) => void
  markingPaid: boolean
  completing: boolean
  showCompleteModal: boolean
  setShowCompleteModal: (b: boolean) => void
  promotionsList: unknown[]
  selectedPromotionId: string
  manualDiscount: string
  downloadingPdf: boolean
  setDownloadingPdf: (b: boolean) => void
  downloadingReceipt: boolean
  setDownloadingReceipt: (b: boolean) => void
  previewMode: 'receipt' | 'invoice' | null
  setPreviewMode: (m: 'receipt' | 'invoice' | null) => void
  handleAddPart: (e: React.FormEvent) => Promise<void>
  handleEditPart: (u: UsageWithNames) => void
  handleSavePart: () => Promise<void>
  handleDeletePart: (usageId: number) => Promise<void>
  handleAssign: () => Promise<void>
  handleMarkPaid: () => Promise<void>
  handleCompleteWithModal: (data: { paymentMethod: string; discountAmount?: number; promotionId?: number }) => Promise<void>
  available: (pid: number) => number
  vehicleForProductSearch: string
  PAYMENT_LABELS: Record<string, string>
  sitesList: unknown[]
  customersList: unknown[]
  vehiclesList: unknown[]
  setSr: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>
}

export function useServiceRequestDetail(id: string | undefined): UseServiceRequestDetailResult {
  const navigate = useNavigate()
  const location = useLocation()

  const [sr, setSr] = useState<Record<string, unknown> | null>(null)
  const [customersList, setCustomersList] = useState<unknown[]>([])
  const [vehiclesList, setVehiclesList] = useState<unknown[]>([])
  const [sitesList, setSitesList] = useState<unknown[]>([])
  const [mechanicsList, setMechanicsList] = useState<unknown[]>([])
  const [productsList, setProductsList] = useState<unknown[]>([])
  const [invList, setInvList] = useState<unknown[]>([])
  const [usageList, setUsageList] = useState<unknown[]>([])
  const [invoiceList, setInvoiceList] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [assigning, setAssigning] = useState(false)
  const [addingPart, setAddingPart] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [previewMode, setPreviewMode] = useState<'receipt' | 'invoice' | null>(null)
  const [assignMechanicId, setAssignMechanicId] = useState('')
  const [addProductId, setAddProductId] = useState('')
  const [addQty, setAddQty] = useState(1)
  const [resetProductSearch, setResetProductSearch] = useState(0)
  const [formError, setFormError] = useState('')
  const [promotionsList, setPromotionsList] = useState<unknown[]>([])
  const [selectedPromotionId] = useState('')
  const [manualDiscount] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [editingUsageId, setEditingUsageId] = useState<number | null>(null)
  const [editingQty, setEditingQty] = useState(1)
  const [updatingUsage, setUpdatingUsage] = useState(false)
  const [deletingUsageId, setDeletingUsageId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [markingPaid, setMarkingPaid] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  const lk = buildLookups(
    customersList as { id: number }[],
    vehiclesList as { id: number }[],
    sitesList as { id: number }[],
    mechanicsList as { id: number }[]
  )
  const siteInv = (invList || []).filter((x: { site: number }) => sr && Number(x.site) === Number(sr.site))
  const invByProduct = Object.fromEntries(siteInv.map((x: { product: number }) => [x.product, x]))
  const productById = Object.fromEntries((productsList || []).map((p: { id: number }) => [p.id, p]))
  const available = (pid: number) => {
    const inv = invByProduct[pid] as { quantity_on_hand?: number; quantity_reserved?: number } | undefined
    if (!inv) return 0
    const onHand = inv.quantity_on_hand ?? 0
    const reserved = inv.quantity_reserved ?? 0
    return Math.max(0, onHand - reserved)
  }
  const usageWithNames: UsageWithNames[] = (usageList || []).map((u: { id: number; product: number; quantity_used: number }) => {
    const p = productById[u.product] as { name?: string; sku?: string; part_number?: string; application?: string; unit_of_measure?: string; unit_price?: number } | undefined
    const price = p?.unit_price != null ? Number(p.unit_price) : 0
    const qty = u.quantity_used ?? 0
    return {
      ...u,
      productName: p?.name ?? `#${u.product}`,
      sku: p?.sku ?? p?.part_number,
      application: p?.application,
      unit: p?.unit_of_measure ?? 'each',
      unitPrice: price,
      lineTotal: price * qty,
      quantity_used: qty,
    }
  })
  const invoiceForSr = (invoiceList || []).find((i: { service_request: number }) => i.service_request === (sr?.id ?? -1)) as Record<string, unknown> | undefined
  const siteMechanics = (sr?.site && mechanicsList.filter((m: { site: number }) => m.site === sr.site)) || []
  const srVehicle = sr?.vehicle ? vehiclesList?.find((v: { id: number }) => v.id === sr.vehicle) : null
  const vehicleForProductSearch = srVehicle ? `${(srVehicle as { make: string }).make} ${(srVehicle as { model: string }).model}` : ''
  const PAYMENT_LABELS = { cash: 'Cash', momo: 'MoMo', pos: 'POS' }

  useEffect(() => {
    if (!id) return
    serviceRequests
      .get(id)
      .then((r: Record<string, unknown>) => {
        setSr(r)
        setAssignMechanicId(r.assigned_mechanic ? String(r.assigned_mechanic) : '')
        setLaborCost(r.labor_cost != null ? String(r.labor_cost) : '')
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !sr) return
    Promise.all([
      customers.list(),
      vehicles.list(),
      promotions.active().catch(() => []),
      sites.list(),
      mechanics.list(),
      products.list(),
      inventory.list(),
      productUsage.list(id),
      invoices.list(),
    ])
      .then(([c, v, prom, s, m, p, i, u, inv]) => {
        setCustomersList(toList(c))
        setVehiclesList(toList(v))
        setPromotionsList(Array.isArray(prom) ? prom : toList(prom))
        setSitesList(toList(s))
        setMechanicsList(toList(m))
        setProductsList(toList(p))
        setInvList(toList(i))
        setUsageList(toList(u))
        setInvoiceList(toList(inv))
      })
      .catch(setError)
  }, [id, sr])

  const handleAssign = async () => {
    if (!sr) return
    setFormError('')
    setAssigning(true)
    try {
      const updated = (await serviceRequests.update(sr.id as number, {
        assigned_mechanic: assignMechanicId ? parseInt(assignMechanicId, 10) : null,
      })) as Record<string, unknown>
      setSr(updated)
      setAssignMechanicId(updated.assigned_mechanic ? String(updated.assigned_mechanic) : '')
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setAssigning(false)
    }
  }

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sr || !addProductId || addQty < 1) return
    setFormError('')
    setAddingPart(true)
    try {
      await productUsage.create({
        service_request: sr.id as number,
        product: parseInt(addProductId, 10),
        quantity_used: addQty,
      })
      const u = await productUsage.list(sr.id as number)
      setUsageList(toList(u))
      setAddProductId('')
      setAddQty(1)
      setResetProductSearch((prev) => prev + 1)
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setAddingPart(false)
    }
  }

  const handleEditPart = (u: UsageWithNames) => {
    setEditingUsageId(u.id)
    setEditingQty(u.quantity_used ?? 1)
  }

  const handleSavePart = async () => {
    if (!editingUsageId || editingQty < 1 || !sr) return
    setFormError('')
    setUpdatingUsage(true)
    try {
      await productUsage.update(editingUsageId, { quantity_used: editingQty })
      const u = await productUsage.list(sr.id as number)
      setUsageList(toList(u))
      setEditingUsageId(null)
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setUpdatingUsage(false)
    }
  }

  const handleDeletePart = async (usageId: number) => {
    const msg = !sr?.vehicle ? 'Remove this item from the sale?' : 'Remove this part from the service request?'
    if (!window.confirm(msg)) return
    setFormError('')
    setDeletingUsageId(usageId)
    try {
      await productUsage.delete(usageId)
      const fresh = await productUsage.list(sr!.id as number)
      setUsageList(toList(fresh))
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setDeletingUsageId(null)
    }
  }

  const handleMarkPaid = async () => {
    if (!invoiceForSr || invoiceForSr.paid) return
    setFormError('')
    setMarkingPaid(true)
    try {
      await invoices.update(invoiceForSr.id as number, {
        paid: true,
        payment_method: paymentMethod,
      })
      const inv = await invoices.list()
      setInvoiceList(toList(inv))
      setFormError('')
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setMarkingPaid(false)
    }
  }

  const handleCompleteWithModal = async (data: { paymentMethod: string; discountAmount?: number; promotionId?: number }) => {
    if (!sr || sr.status === 'Completed') return
    setFormError('')
    setCompleting(true)
    const body: Record<string, unknown> = {}
    if (data.promotionId) body.promotion_id = data.promotionId
    if (data.discountAmount && data.discountAmount > 0) body.discount_amount = data.discountAmount
    if (laborCost.trim() && !isNaN(parseFloat(laborCost)) && parseFloat(laborCost) >= 0) {
      body.labor_cost = parseFloat(laborCost)
    }
    try {
      const updated = (await serviceRequests.complete(sr.id as number, Object.keys(body).length ? body : undefined)) as Record<string, unknown>
      setSr(updated)
      const [u, inv] = await Promise.all([productUsage.list(sr.id as number), invoices.list()])
      setUsageList(toList(u))
      setInvoiceList(toList(inv))
      const invForSr = toList(inv).find((i: { service_request: number }) => i.service_request === sr.id)
      if (invForSr) {
        await invoices.update(invForSr.id, { paid: true, payment_method: data.paymentMethod })
        const invFresh = await invoices.list()
        setInvoiceList(toList(invFresh))
      }
      setShowCompleteModal(false)
    } catch (e) {
      setFormError(apiErrorMsg(e))
      throw e
    } finally {
      setCompleting(false)
    }
  }

  return {
    sr,
    loading,
    error,
    lk,
    usageWithNames,
    invoiceForSr,
    siteMechanics,
    productById,
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
    assignMechanicId,
    setAssignMechanicId,
    assigning,
    laborCost,
    setLaborCost,
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
    handleAssign,
    handleMarkPaid,
    handleCompleteWithModal,
    available,
    vehicleForProductSearch,
    PAYMENT_LABELS,
    sitesList,
    customersList,
    vehiclesList,
    setSr,
  }
}
