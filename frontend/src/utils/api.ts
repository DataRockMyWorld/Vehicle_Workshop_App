/**
 * Build URL search params from a record. Skips undefined/null/empty string values.
 */
export function buildApiParams(params: Record<string, string | number | boolean | undefined | null>): URLSearchParams {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v))
    }
  }
  return sp
}

/**
 * Append params to a base path. Returns "path" or "path?key=val"
 */
export function withParams(path: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}
