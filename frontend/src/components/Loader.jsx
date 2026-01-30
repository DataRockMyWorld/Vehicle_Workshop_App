import './Loader.css'

/**
 * Workshop-themed loader: gear/cog animation.
 * Use for data fetching states.
 */
export default function Loader({ size = 'medium', label = 'Loading...' }) {
  const sizeClass = `loader--${size}`
  return (
    <div className={`loader ${sizeClass}`} role="status" aria-live="polite" aria-label={label}>
      <div className="loader__icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" className="loader__svg">
          <g className="loader__gear" fill="currentColor">
            <circle cx="32" cy="32" r="8" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <rect
                key={deg}
                x="30"
                y="4"
                width="4"
                height="12"
                rx="1"
                transform={`rotate(${deg} 32 32)`}
              />
            ))}
          </g>
        </svg>
      </div>
      {label && <span className="loader__label">{label}</span>}
    </div>
  )
}
