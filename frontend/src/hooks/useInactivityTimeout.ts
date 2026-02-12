import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes
const WARNING_TIME = 60 * 1000 // 60 seconds before logout

export function useInactivityTimeout() {
  const { logout } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const warningTimeoutRef = useRef<NodeJS.Timeout>()
  const logoutTimeoutRef = useRef<NodeJS.Timeout>()
  const countdownIntervalRef = useRef<NodeJS.Timeout>()

  const resetTimer = () => {
    // Clear all existing timers
    clearTimeout(warningTimeoutRef.current)
    clearTimeout(logoutTimeoutRef.current)
    clearInterval(countdownIntervalRef.current)
    
    setShowWarning(false)
    setCountdown(60)

    // Set warning timer (show modal 60 seconds before logout)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true)
      let count = 60
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        count -= 1
        setCountdown(count)
        
        if (count <= 0) {
          clearInterval(countdownIntervalRef.current)
          logout()
        }
      }, 1000)
    }, INACTIVITY_TIMEOUT)
  }

  const extendSession = () => {
    resetTimer()
  }

  useEffect(() => {
    // Track these user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    
    // Debounce to avoid excessive timer resets
    let debounceTimer: NodeJS.Timeout
    const debouncedReset = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(resetTimer, 1000)
    }

    events.forEach(event => {
      window.addEventListener(event, debouncedReset, { passive: true })
    })

    // Initialize timer
    resetTimer()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, debouncedReset)
      })
      clearTimeout(warningTimeoutRef.current)
      clearTimeout(logoutTimeoutRef.current)
      clearInterval(countdownIntervalRef.current)
      clearTimeout(debounceTimer)
    }
  }, [])

  return { showWarning, countdown, extendSession }
}
