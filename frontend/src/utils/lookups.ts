import type { Customer, Vehicle, Site } from '../types'

export function buildLookups(
  customersList: Customer[],
  vehiclesList: Vehicle[],
  sitesList: Site[]
) {
  const byId = <T extends { id: number }>(arr: T[]) =>
    Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const c = byId(customersList)
  const v = byId(vehiclesList)
  const s = byId(sitesList)
  return {
    customer: (id: number) =>
      c[id] ? `${(c[id] as Customer).first_name || ''} ${(c[id] as Customer).last_name || ''}`.trim() || `#${id}` : `#${id}`,
    vehicle: (id: number | null | undefined) =>
      !id ? 'Sales' : v[id] ? `${(v[id] as Vehicle).make} ${(v[id] as Vehicle).model} (${(v[id] as Vehicle).license_plate})` : `#${id}`,
    site: (id: number) => (s[id] ? (s[id] as Site).name : `#${id}`),
  }
}
