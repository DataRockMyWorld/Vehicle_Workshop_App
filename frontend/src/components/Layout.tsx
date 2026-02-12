import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useInactivityTimeout } from '../hooks/useInactivityTimeout'
import Breadcrumbs from './Breadcrumbs'
import InactivityWarningModal from './InactivityWarningModal'
import './Layout.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/service-requests', label: 'Service requests', end: false },
  { to: '/parts-sale', label: 'Sales', end: false },
  { to: '/customers', label: 'Customers', end: false },
  { to: '/vehicles', label: 'Vehicles', end: false },
  { to: '/mechanics', label: 'Mechanics', end: false },
  { to: '/sites', label: 'Sites', end: false, requiresCanSeeAllSites: true },
  { to: '/products', label: 'Products', end: false, requiresCanSeeAllSites: true },
  { to: '/promotions', label: 'Promotions', end: false, requiresCanSeeAllSites: true },
  { to: '/inventory', label: 'Inventory', end: false },
  { to: '/invoices', label: 'Invoices', end: false },
  { to: '/reports/sales', label: 'Sales report', end: false },
  { to: '/audit', label: 'Audit trail', end: false },
]

function NavLinks({
  items,
  onNavigate,
}: {
  items: Array<{ to: string; label: string; end: boolean }>
  onNavigate?: () => void
}) {
  return (
    <>
      {items.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => 'layout__link' + (isActive ? ' layout__link--active' : '')}
          onClick={onNavigate}
        >
          {label}
        </NavLink>
      ))}
    </>
  )
}

export default function Layout() {
  const { user, logout, canSeeAllSites } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const { showWarning, countdown, extendSession } = useInactivityTimeout()

  const navItems = NAV_ITEMS.filter(
    (item) => !(item as { requiresCanSeeAllSites?: boolean }).requiresCanSeeAllSites || canSeeAllSites
  ).map(({ to, label, end }) => ({ to, label, end }))

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
      const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu()
      document.addEventListener('keydown', onKeyDown)
      return () => {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', onKeyDown)
      }
    }
    return undefined
  }, [menuOpen])

  return (
    <div className="layout">
      <InactivityWarningModal
        isOpen={showWarning}
        countdown={countdown}
        onExtend={extendSession}
      />
      <aside className="layout__side layout__side--desktop">
        <div className="layout__brand">
          <img src="/logo.png" alt="" className="layout__logo" aria-hidden="true" />
          <span className="layout__name">Feeling Autopart</span>
        </div>
        <nav className="layout__nav" aria-label="Main">
          <NavLinks items={navItems} />
        </nav>
        <div className="layout__side-foot">
          <span className="layout__user" title={user?.email}>{user?.email || 'User'}</span>
          <button type="button" className="layout__out" onClick={() => { logout(); navigate('/login') }} aria-label="Sign out">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="layout__backdrop"
          onClick={closeMenu}
          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Escape' && closeMenu()}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}

      {/* Mobile slide-over menu */}
      <aside
        className={`layout__drawer ${menuOpen ? 'layout__drawer--open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="layout__drawer-head">
          <div className="layout__brand">
            <img src="/logo.png" alt="" className="layout__logo" aria-hidden="true" />
            <span className="layout__name">Feeling Autopart</span>
          </div>
          <button
            type="button"
            className="layout__close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="layout__drawer-nav" aria-label="Main">
          <NavLinks items={navItems} onNavigate={closeMenu} />
        </nav>
        <div className="layout__drawer-foot">
          <span className="layout__user" title={user?.email}>{user?.email || 'User'}</span>
          <button
            type="button"
            className="layout__out"
            onClick={() => { logout(); navigate('/login'); closeMenu() }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="layout__main">
        <header className="layout__header">
          <button
            type="button"
            className="layout__hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </header>
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
  )
}
