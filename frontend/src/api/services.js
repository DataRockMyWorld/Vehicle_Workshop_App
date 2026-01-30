import { api, apiDownload } from './client'

/** Current user info (can_write, can_see_all_sites). */
export const me = () => api('me/')

/** Global search: service requests, customers, vehicles */
export const search = (q, limit = 10) =>
  api(`search/?q=${encodeURIComponent(q || '')}&limit=${limit}`)

/** CEO/HQ dashboard. Returns 403 for site-scoped users. */
export const dashboard = {
  get: (period = 30) => api(`dashboard/?period=${period}`),
  getActivities: (limit = 25) => api(`dashboard/activities/?limit=${limit}`),
}

export const serviceCategories = {
  list: () => api('service-categories/'),
}

export const serviceRequests = {
  list: () => api('service_request/'),
  get: (id) => api(`service_request/${id}/`),
  create: (body) => api('service_request/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`service_request/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  complete: (id, body) =>
    api(`service_request/${id}/complete/`, {
      method: 'POST',
      ...(body && Object.keys(body).length ? { body: JSON.stringify(body) } : {}),
    }),
  delete: (id) => api(`service_request/${id}/`, { method: 'DELETE' }),
}

export const customers = {
  list: () => api('customers/'),
  get: (id) => api(`customers/${id}/`),
  create: (body) => api('customers/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`customers/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api(`customers/${id}/`, { method: 'DELETE' }),
}

export const vehicles = {
  list: () => api('vehicle/'),
  get: (id) => api(`vehicle/${id}/`),
  create: (body) => api('vehicle/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`vehicle/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api(`vehicle/${id}/`, { method: 'DELETE' }),
}

export const mechanics = {
  list: () => api('mechanic/'),
  get: (id) => api(`mechanic/${id}/`),
  create: (body) => api('mechanic/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`mechanic/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api(`mechanic/${id}/`, { method: 'DELETE' }),
}

export const sites = {
  list: () => api('sites/'),
  get: (id) => api(`sites/${id}/`),
  create: (body) => api('sites/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`sites/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api(`sites/${id}/`, { method: 'DELETE' }),
}

export const products = {
  list: () => api('products/'),
  get: (id) => api(`products/${id}/`),
  create: (body) => api('products/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`products/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api(`products/${id}/`, { method: 'DELETE' }),
}

export const appointments = {
  list: () => api('appointments/'),
  get: (id) => api(`appointments/${id}/`),
  create: (body) => api('appointments/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`appointments/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api(`appointments/${id}/`, { method: 'DELETE' }),
  availability: (mechanicId, date, siteId) =>
    api(`appointments/availability/?mechanic_id=${mechanicId}&date=${date}&site_id=${siteId}`),
}

export const inventory = {
  list: () => api('inventory/'),
  lowStock: () => api('inventory/low-stock/'),
  get: (id) => api(`inventory/${id}/`),
  create: (body) => api('inventory/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`inventory/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api(`inventory/${id}/`, { method: 'DELETE' }),
}

export const invoices = {
  list: () => api('invoices/'),
  downloadPdf: (id) => apiDownload(`invoices/${id}/pdf/`, `invoice-${id}.pdf`),
}
export const promotions = {
  active: () => api('promotions/active/'),
}
export const audit = {
  list: () => api('audit/'),
}

export const reports = {
  get: (period = 30) => api(`dashboard/reports/?period=${period}`),
  exportCsv: (resource) => apiDownload(`dashboard/export/?resource=${resource}`, `${resource}.csv`),
}

export const productUsage = {
  list: (serviceRequestId) => api(`product-usage/${serviceRequestId}/`),
  create: (body) => api('product-usage/', { method: 'POST', body: JSON.stringify(body) }),
}
