const BASE = ''
const API = '/api/v1'

function getAuthHeaders() {
  const token = localStorage.getItem('access')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function clearTokens() {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
  try { window.dispatchEvent(new CustomEvent('auth:logout')) } catch (_) {}
}

export async function api(path, options = {}) {
  const url = path.startsWith('/auth') ? `${BASE}${path}` : `${API}/${path.replace(/^\/+/, '')}`
  const method = (options.method || 'GET').toUpperCase()
  const hasBody = method !== 'GET' && options.body != null
  const headers = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...getAuthHeaders(),
    ...options.headers,
  }
  const res = await fetch(url, { ...options, headers })
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}))
  if (!res.ok) {
    const isAuth = path.startsWith('/auth')
    if (res.status === 401 && !isAuth && !options._retried) {
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const out = await refreshToken(refresh)
          localStorage.setItem('access', out.access)
          if (out.refresh) localStorage.setItem('refresh', out.refresh)
          return api(path, { ...options, _retried: true })
        } catch (_) { /* refresh failed */ }
      }
      clearTokens()
    }
    throw { status: res.status, ...data }
  }
  return data
}

/** Fetch a binary response (PDF, CSV) with auth and trigger download. */
export async function apiDownload(path, filename) {
  const url = `${API}/${path.replace(/^\/+/, '')}`
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
export function toList(x) {
  if (Array.isArray(x)) return x
  if (x && Array.isArray(x.results)) return x.results
  return []
}

/** Normalize API error for display. Handles Error, detail string/array, field errors, status codes. */
export function apiErrorMsg(err) {
  if (!err) return 'Something went wrong.'
  if (err instanceof Error) {
    const msg = err.message || ''
    if (/fetch|network|failed to fetch/i.test(msg)) return 'Network error. Check your connection and that the API is running.'
    return msg || 'Something went wrong.'
  }
  if (typeof err !== 'object') return 'Something went wrong.'
  const d = err.detail
  if (Array.isArray(d) && d[0]) return String(d[0])
  if (typeof d === 'string') {
    if (/token.*(invalid|expired|not valid)|(invalid|expired|not valid).*token/i.test(d)) return 'Session expired. Please sign in again.'
    return d
  }
  const status = err.status
  const byStatus = {
    400: 'Invalid request.',
    401: 'Session expired. Please sign in again.',
    403: "You don't have permission to do that.",
    404: 'Not found.',
    422: 'Validation error.',
    429: 'Too many attempts. Please try again in a minute.',
  }
  if (status >= 500) return 'Server error. Please try again later.'
  if (byStatus[status]) return byStatus[status]
  const field = Object.keys(err).find((k) => k !== 'status' && Array.isArray(err[k]) && err[k][0])
  if (field) return `${field}: ${err[field][0]}`
  if (d != null) return String(d)
  const fallback = status ? `Request failed (${status}).` : 'Something went wrong.'
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn('[apiErrorMsg] Using fallback:', fallback, err)
  }
  return fallback
}

export async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, ...data }
  return data
}

export async function refreshToken(refresh) {
  const res = await fetch(`${BASE}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, ...data }
  return data
}

/** Blacklist the refresh token so it cannot be used again. Call before clearing local storage. */
export async function logout(refresh) {
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
