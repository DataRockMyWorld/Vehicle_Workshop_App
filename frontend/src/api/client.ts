const BASE = ''
const API = '/api/v1'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function clearTokens(): void {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
  try {
    window.dispatchEvent(new CustomEvent('auth:logout'))
  } catch {
    /* ignore */
  }
}

export interface ApiOptions extends RequestInit {
  _retried?: boolean
}

function buildUrl(path: string): string {
  if (path.startsWith('/auth')) return path.startsWith('/') ? path : `/${path}`
  const clean = path.replace(/^\/+/, '')
  return clean ? `${API}/${clean}` : API
}

export async function api(path: string, options: ApiOptions = {}): Promise<unknown> {
  const url = buildUrl(path)
  const method = (options.method || 'GET').toUpperCase()
  const hasBody = method !== 'GET' && options.body != null
  const isFormData = hasBody && options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string>),
  }
  const res = await fetch(url, { ...options, headers })
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}))
  if (!res.ok) {
    const isAuth = path.startsWith('/auth')
    if (res.status === 401 && !isAuth && !options._retried) {
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const out = (await refreshToken(refresh)) as { access: string; refresh?: string }
          localStorage.setItem('access', out.access)
          if (out.refresh) localStorage.setItem('refresh', out.refresh)
          return api(path, { ...options, _retried: true })
        } catch {
          /* refresh failed */
        }
      }
      clearTokens()
    }
    throw { status: res.status, ...(data as object) }
  }
  return data
}

/** Fetch a binary response (PDF, CSV) with auth and trigger download. */
export async function apiDownload(path: string, filename?: string): Promise<void> {
  const url = buildUrl(path)
  const headers = { ...getAuthHeaders() }
  const res = await fetch(url, { headers })
  if (!res.ok) throw { status: res.status, detail: res.statusText }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename || 'download'
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Ensure we have an array from list APIs (raw array or paginated { results }). */
export function toList(x: unknown): unknown[] {
  if (Array.isArray(x)) return x
  if (x && typeof x === 'object' && 'results' in x && Array.isArray((x as { results: unknown[] }).results)) {
    return (x as { results: unknown[] }).results
  }
  return []
}

/** Normalize API error for display. Handles Error, detail string/array, field errors, status codes. */
export function apiErrorMsg(err: unknown): string {
  if (!err) return 'Something went wrong.'
  if (err instanceof Error) {
    const msg = err.message || ''
    if (/fetch|network|failed to fetch/i.test(msg)) return 'Network error. Check your connection and that the API is running.'
    return msg || 'Something went wrong.'
  }
  if (typeof err !== 'object') return 'Something went wrong.'
  const obj = err as Record<string, unknown>
  const d = obj.detail
  if (Array.isArray(d) && d[0]) return String(d[0])
  if (typeof d === 'string') {
    if (/token.*(invalid|expired|not valid)|(invalid|expired|not valid).*token/i.test(d)) return 'Session expired. Please sign in again.'
    return d
  }
  const status = obj.status as number | undefined
  const byStatus: Record<number, string> = {
    400: 'Invalid request.',
    401: 'Session expired. Please sign in again.',
    403: "You don't have permission to do that.",
    404: 'Not found.',
    422: 'Validation error.',
    429: 'Too many attempts. Please try again in a minute.',
  }
  if (status && status >= 500) return 'Server error. Please try again later.'
  if (status && byStatus[status]) return byStatus[status]
  const field = Object.keys(obj).find((k) => k !== 'status' && Array.isArray(obj[k]) && (obj[k] as unknown[])[0])
  if (field) return `${field}: ${(obj[field] as unknown[])[0]}`
  if (d != null) return String(d)
  const fallback = status ? `Request failed (${status}).` : 'Something went wrong.'
  if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    console.warn('[apiErrorMsg] Using fallback:', fallback, err)
  }
  return fallback
}

export async function login(email: string, password: string): Promise<{ access: string; refresh: string }> {
  const res = await fetch(`${BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = (await res.json().catch(() => ({}))) as { access?: string; refresh?: string }
  if (!res.ok) throw { status: res.status, ...data }
  return data as { access: string; refresh: string }
}

export async function refreshToken(refresh: string): Promise<{ access: string; refresh?: string }> {
  const res = await fetch(`${BASE}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  const data = (await res.json().catch(() => ({}))) as { access?: string; refresh?: string }
  if (!res.ok) throw { status: res.status, ...data }
  return data as { access: string; refresh?: string }
}

/** Blacklist the refresh token so it cannot be used again. Call before clearing local storage. */
export async function logout(refresh: string | null): Promise<void> {
  if (!refresh) return
  try {
    await fetch(`${BASE}/auth/logout/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
  } catch {
    /* Ignore; we still clear local state */
  }
}
