import type { ReactNode } from 'react'

/** API error shape from Django REST Framework */
export interface ApiError {
  status?: number
  detail?: string | string[]
  [key: string]: unknown
}

/** Me endpoint response */
export interface MeResponse {
  can_write?: boolean
  can_see_all_sites?: boolean
  site_id?: number | null
  is_superuser?: boolean
  email?: string
  [key: string]: unknown
}

/** Auth user shape */
export interface AuthUser {
  email: string
}

/** Auth context value */
export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ access: string; refresh: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  canWrite: boolean
  canSeeAllSites: boolean
  siteId: number | null
  isSuperuser: boolean
}

/** Lookup helpers for customer, vehicle, site */
export interface Customer {
  id: number
  first_name?: string
  last_name?: string
  [key: string]: unknown
}

export interface Vehicle {
  id: number
  make?: string
  model?: string
  license_plate?: string
  customer?: number
  [key: string]: unknown
}

export interface Site {
  id: number
  name?: string
  [key: string]: unknown
}

export interface ServiceRequest {
  id: number
  customer: number
  vehicle?: number | null
  site: number
  status?: string
  service_type_display?: string
  [key: string]: unknown
}

export interface Appointment {
  id: number
  display_number?: string
  customer?: number
  vehicle?: number
  site?: number
  mechanic?: number
  scheduled_date?: string
  scheduled_time?: string
  status?: string
  [key: string]: unknown
}

export interface Invoice {
  id: number
  service_request: number
  total_cost?: number
  paid?: boolean
  payment_method?: string
  [key: string]: unknown
}

export interface InventoryItem {
  id: number
  product: number
  site: number
  quantity_on_hand?: number
  quantity_reserved?: number
  reorder_level?: number
  bin_location?: string
  [key: string]: unknown
}

export interface StockAlert {
  id: number
  product_name: string
  site_name: string
  quantity_on_hand: number
  reorder_level: number
  [key: string]: unknown
}

export interface AuditLog {
  id: number
  created_at?: string
  action?: string
  model_label?: string
  object_repr?: string
  changes?: unknown
  user?: string
  [key: string]: unknown
}

/** Product search result */
export interface ProductSearchResult {
  id: number
  name: string
  fmsi_number?: string
  product_type?: string
  position?: string
  application?: string
  unit_price?: number
  image_url?: string | null
  [key: string]: unknown
}

/** Search API response */
export interface SearchResponse {
  service_requests?: SearchResultItem[]
  customers?: SearchResultItem[]
  vehicles?: SearchResultItem[]
}

export interface SearchResultItem {
  id: number
  type: string
  url?: string
  title?: string
  subtitle?: string
}

/** Component prop helpers */
export interface ChildrenProps {
  children: ReactNode
}
