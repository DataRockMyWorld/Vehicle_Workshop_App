import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  const [showWarning, setShowWarning] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Warn before closing tab/browser
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Intercept React Router navigation
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href && !link.href.startsWith('mailto:') && !link.href.startsWith('tel:')) {
        const url = new URL(link.href)
        const newPath = url.pathname
        
        if (newPath !== location.pathname) {
          e.preventDefault()
          setPendingNavigation(newPath)
          setShowWarning(true)
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [hasUnsavedChanges, location.pathname])

  const confirmNavigation = useCallback(() => {
    if (pendingNavigation) {
      setShowWarning(false)
      navigate(pendingNavigation)
      setPendingNavigation(null)
    }
  }, [pendingNavigation, navigate])

  const cancelNavigation = useCallback(() => {
    setShowWarning(false)
    setPendingNavigation(null)
  }, [])

  return {
    showWarning,
    confirmNavigation,
    cancelNavigation,
  }
}
