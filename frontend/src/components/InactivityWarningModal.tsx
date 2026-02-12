import { useEffect } from 'react'
import './InactivityWarningModal.css'

interface InactivityWarningModalProps {
  isOpen: boolean
  countdown: number
  onExtend: () => void
}

export default function InactivityWarningModal({ isOpen, countdown, onExtend }: InactivityWarningModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Play alert sound (optional)
      // const audio = new Audio('/alert.mp3')
      // audio.play().catch(() => {})
      
      // Focus the extend button for keyboard accessibility
      const button = document.getElementById('extend-session-btn')
      button?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="inactivity-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="inactivity-title">
      <div className="inactivity-modal">
        <div className="inactivity-modal__icon">⏰</div>
        <h2 id="inactivity-title" className="inactivity-modal__title">
          Session Timeout Warning
        </h2>
        <p className="inactivity-modal__message">
          You've been inactive for a while. For your security, you'll be automatically logged out in:
        </p>
        <div className="inactivity-modal__countdown">
          <span className="inactivity-modal__countdown-number">{countdown}</span>
          <span className="inactivity-modal__countdown-label">seconds</span>
        </div>
        <p className="inactivity-modal__hint">
          Click the button below to stay logged in and continue working.
        </p>
        <button
          id="extend-session-btn"
          type="button"
          className="btn btn--primary btn--large inactivity-modal__button"
          onClick={onExtend}
          autoFocus
        >
          Stay Logged In
        </button>
      </div>
    </div>
  )
}
