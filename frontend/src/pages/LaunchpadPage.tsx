import { Link } from 'react-router-dom'
import './LaunchpadPage.css'

const ACTIONS = [
  {
    to: '/parts-sale/new',
    label: 'Sales',
    description: 'Quick sale · Sell parts to walk-in or registered customers',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    to: '/service-requests/new',
    label: 'Service Request',
    description: 'Create a new service request for a customer vehicle',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    description: 'View analytics, metrics, and business overview',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
]

export default function LaunchpadPage() {
  return (
    <div className="launchpad">
      <div className="launchpad__content">
        <h1 className="launchpad__title">Quick Actions</h1>
        <p className="launchpad__subtitle">
          Choose what you want to do
        </p>
        <div className="launchpad__grid">
          {ACTIONS.map(({ to, label, description, icon }) => (
            <Link
              key={to}
              to={to}
              className="launchpad__card"
              aria-label={`${label}: ${description}`}
            >
              <span className="launchpad__icon" aria-hidden="true">
                {icon}
              </span>
              <span className="launchpad__label">{label}</span>
              <span className="launchpad__desc">{description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
