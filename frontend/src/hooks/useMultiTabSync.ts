import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export function useMultiTabSync() {
  const { logout } = useAuth()

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access' && e.newValue === null) {
        logout()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [logout])

  useEffect(() => {
    const handleAuthLogout = () => {
      logout()
    }

    window.addEventListener('auth:logout', handleAuthLogout)
    return () => window.removeEventListener('auth:logout', handleAuthLogout)
  }, [logout])
}
