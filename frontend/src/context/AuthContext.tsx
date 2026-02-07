import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { login as apiLogin, logout as apiLogout, refreshToken } from '../api/client'
import { me } from '../api/services'
import type { AuthUser, AuthContextValue, MeResponse } from '../types'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [canWrite, setCanWrite] = useState(true)
  const [canSeeAllSites, setCanSeeAllSites] = useState(false)
  const [siteId, setSiteId] = useState<number | null>(null)
  const [isSuperuser, setIsSuperuser] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const data = (await me()) as MeResponse
      setCanWrite(data?.can_write !== false)
      setCanSeeAllSites(data?.can_see_all_sites === true)
      setSiteId(data?.site_id ?? null)
      setIsSuperuser(data?.is_superuser === true)
      return data
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status === 401) setUser(null)
      setCanWrite(true)
      setCanSeeAllSites(false)
      setSiteId(null)
      setIsSuperuser(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password)
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    localStorage.setItem('user_email', email)
    setUser({ email })
    await fetchMe()
    return data
  }, [fetchMe])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('refresh')
    await apiLogout(refresh ?? null)
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    localStorage.removeItem('user_email')
    setUser(null)
    setCanWrite(true)
    setCanSeeAllSites(false)
    setSiteId(null)
    setIsSuperuser(false)
  }, [])

  const restore = useCallback(async () => {
    const access = localStorage.getItem('access')
    const refresh = localStorage.getItem('refresh')
    const email = localStorage.getItem('user_email')
    if (!access && !refresh) {
      setLoading(false)
      return
    }
    if (access) {
      setUser({ email: email || '(signed in)' })
      fetchMe().finally(() => setLoading(false))
      return
    }
    try {
      const data = await refreshToken(refresh!)
      localStorage.setItem('access', data.access)
      if (data.refresh) localStorage.setItem('refresh', data.refresh)
      setUser({ email: email || '(signed in)' })
      await fetchMe()
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout, fetchMe])

  useEffect(() => {
    restore()
  }, [restore])

  useEffect(() => {
    const onLogout = () => logout()
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [logout])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user, canWrite, canSeeAllSites, siteId, isSuperuser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
