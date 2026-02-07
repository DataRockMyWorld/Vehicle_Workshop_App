import './Loader.css'

interface LoaderProps {
  size?: 'small' | 'medium' | 'large'
  label?: string
}

/**
 * Polished loader: smooth gradient ring with chasing tail.
 * Use for data fetching states.
 */
export default function Loader({ size = 'medium', label = 'Loading...' }: LoaderProps) {
  const sizeClass = `loader--${size}`
  return (
    <div className={`loader ${sizeClass}`} role="status" aria-live="polite" aria-label={label}>
      <div className="loader__icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" className="loader__svg">
          <defs>
            <linearGradient id="loader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-hover)" />
            </linearGradient>
          </defs>
          <circle
            className="loader__track"
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="4"
          />
          <circle
            className="loader__arc"
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            stroke="url(#loader-gradient)"
          />
        </svg>
      </div>
      {label && <span className="loader__label">{label}</span>}
    </div>
  )
}
