import { api, apiDownload } from './client'
import { buildApiParams, withParams } from '../utils/api'

/** Current user info (can_write, can_see_all_sites). */
export const me = () => api('me/')

/** Global search: service requests, customers, vehicles */
export const search = (q: string, limit = 10) =>
  api(`search/?q=${encodeURIComponent(q || '')}&limit=${limit}`)

/** CEO/HQ dashboard. Returns 403 for site-scoped users. */
export const dashboard = {
  get: (period = 30, siteId?: number | string) => {
    const params = buildApiParams({ period, site_id: siteId })
    return api(withParams('dashboard/', params))
  },
  getActivities: (limit = 5, siteId?: number | string) => {
    const params = buildApiParams({ limit, site_id: siteId })
    return api(withParams('dashboard/activities/', params))
  },
  /** Site-scoped sales metrics (revenue, sales count for today/week). */
  site: () => api('dashboard/site/', { cache: 'no-store' }),
}

export const serviceCategories = {
  list: () => api('service-categories/'),
}

export const serviceRequests = {
  list: (params: { customer_id?: number; vehicle_id?: number; mechanic_id?: number; parts_only?: boolean; status?: string; page?: number } = {}) => {
    const sp = buildApiParams({
      customer_id: params.customer_id,
      vehicle_id: params.vehicle_id,
      mechanic_id: params.mechanic_id,
      parts_only: params.parts_only ? true : undefined,
      status: params.status || undefined,
      page: params.page,
    })
    return api(withParams('service_request/', sp))
  },
  get: (id: number | string) => api(`service_request/${id}/`),
  create: (body: Record<string, unknown>) => api('service_request/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: Record<string, unknown>) => api(`service_request/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  complete: (id: number | string, body?: Record<string, unknown>) =>
    api(`service_request/${id}/complete/`, {
      method: 'POST',
      ...(body && Object.keys(body).length ? { body: JSON.stringify(body) } : {}),
    }),
  delete: (id: number | string) => api(`service_request/${id}/`, { method: 'DELETE' }),
}

export const customers = {
  list: (page?: number) => api(page ? `customers/?page=${page}` : 'customers/'),
  get: (id: number | string) => api(`customers/${id}/`),
  create: (body: Record<string, unknown>) => api('customers/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: Record<string, unknown>) => api(`customers/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number | string) => api(`customers/${id}/`, { method: 'DELETE' }),
  walkin: () => api('customers/walkin/'),
}

export const vehicles = {
  list: (page?: number) => api(page ? `vehicle/?page=${page}` : 'vehicle/'),
  get: (id: number | string) => api(`vehicle/${id}/`),
  create: (body: Record<string, unknown>) => api('vehicle/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: Record<string, unknown>) => api(`vehicle/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number | string) => api(`vehicle/${id}/`, { method: 'DELETE' }),
}

export const mechanics = {
  list: (page?: number) => api(page ? `mechanic/?page=${page}` : 'mechanic/'),
  get: (id: number | string) => api(`mechanic/${id}/`),
  create: (body: Record<string, unknown>) => api('mechanic/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: Record<string, unknown>) => api(`mechanic/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number | string) => api(`mechanic/${id}/`, { method: 'DELETE' }),
}

export const sites = {
  list: (page?: number) => api(page ? `sites/?page=${page}` : 'sites/'),
  get: (id: number | string) => api(`sites/${id}/`),
  create: (body: Record<string, unknown>) => api('sites/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: Record<string, unknown>) => api(`sites/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number | string) => api(`sites/${id}/`, { method: 'DELETE' }),
}

export const products = {
  list: (page?: number) => api(page ? `products/?page=${page}` : 'products/'),
  search: (q: string, limit = 15, { vehicle = '', siteId = '' }: { vehicle?: string; siteId?: string } = {}) => {
    const params = new URLSearchParams({ q: q || '', limit: String(limit) })
    if (vehicle) params.set('vehicle', vehicle)
    if (siteId) params.set('site_id', String(siteId))
    return api(`products/search/?${params}`)
  },
  get: (id: number | string) => api(`products/${id}/`),
  create: (body: Record<string, unknown>) => api('products/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: Record<string, unknown>) => api(`products/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number | string) => api(`products/${id}/`, { method: 'DELETE' }),
  importExcel: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api('products/import-excel/', { method: 'POST', body: fd })
  },
}

export const appointments = {
  list: (page?: number) => api(page ? `appointments/?page=${page}` : 'appointments/'),
  get: (id: number | string) => api(`appointments/${id}/`),
  create: (body: Record<string, unknown>) => api('appointments/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: Record<string, unknown>) => api(`appointments/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number | string) => api(`appointments/${id}/`, { method: 'DELETE' }),
  availability: (mechanicId: number | string, date: string, siteId: number | string) =>
    api(`appointments/availability/?mechanic_id=${mechanicId}&date=${date}&site_id=${siteId}`),
}

export const inventory = {
  list: (params?: { page?: number; site_id?: number | string; low_stock?: boolean }) => {
    const p = buildApiParams({
      page: params?.page,
      site_id: params?.site_id,
      low_stock: params?.low_stock ? true : undefined,
    })
    return api(withParams('inventory/', p))
  },
  lowStock: () => api('inventory/low-stock/'),
  get: (id: number | string) => api(`inventory/${id}/`),
  create: (body: Record<string, unknown>) => api('inventory/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: Record<string, unknown>) => api(`inventory/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number | string) => api(`inventory/${id}/`, { method: 'DELETE' }),
}

export const invoices = {
  list: (page?: number) => api(page ? `invoices/?page=${page}` : 'invoices/'),
  get: (id: number | string) => api(`invoices/${id}/`),
  update: (id: number | string, body: Record<string, unknown>) => api(`invoices/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  /** A4 invoice PDF – international standard, print-ready */
  downloadPdf: (id: number | string) => apiDownload(`invoices/${id}/pdf/`, `feeling-autopart-invoice-${id}.pdf`),
  /** 80mm thermal receipt PDF – POS format */
  downloadReceipt: (id: number | string) => apiDownload(`invoices/${id}/receipt/`, `receipt-${id}.pdf`),
}

export const promotions = {
  active: () => api('promotions/active/'),
}

export const audit = {
  list: () => api('audit/'),
}

export const reports = {
  get: (period = 30) => api(`dashboard/reports/?period=${period}`),
  exportCsv: (resource: string, params?: { date_from?: string; date_to?: string; period?: number }) => {
    const sp = new URLSearchParams({ resource })
    if (params?.date_from) sp.set('date_from', params.date_from)
    if (params?.date_to) sp.set('date_to', params.date_to)
    if (params?.period) sp.set('period', String(params.period))
    return apiDownload(`dashboard/export/?${sp}`, `${resource}.csv`)
  },
  /**
   * Audit-ready sales report. Supports date_from/date_to or period.
   * GET /api/v1/dashboard/sales-report/
   */
  salesReport: (params: { date_from?: string; date_to?: string; period?: number; site_id?: number; group_by?: 'day' | 'week' | 'month' } = {}) => {
    const p = buildApiParams({
      date_from: params.date_from,
      date_to: params.date_to,
      period: params.period,
      site_id: params.site_id,
      group_by: params.group_by,
    })
    return api(withParams('dashboard/sales-report/', p))
  },
}

export const productUsage = {
  list: (serviceRequestId: number | string) => api(`product-usage/${serviceRequestId}/`),
  create: (body: Record<string, unknown>) => api('product-usage/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: Record<string, unknown>) => api(`product-usage-item/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number | string) => api(`product-usage-item/${id}/`, { method: 'DELETE', cache: 'no-store' as RequestCache }),
}
