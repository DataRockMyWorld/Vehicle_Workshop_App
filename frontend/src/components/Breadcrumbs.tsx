import { Link, useLocation } from 'react-router-dom'
import './Breadcrumbs.css'

const routeLabels: Record<string, string> = {
  '': 'Home',
  'dashboard': 'Dashboard',
  'service-requests': 'Service Requests',
  'parts-sale': 'Sales',
  'customers': 'Customers',
  'vehicles': 'Vehicles',
  'mechanics': 'Mechanics',
  'sites': 'Sites',
  'products': 'Products',
  'promotions': 'Promotions',
  'inventory': 'Inventory',
  'invoices': 'Invoices',
  'audit': 'Audit Trail',
  'reports': 'Reports',
  'sales': 'Sales',
  'new': 'New',
}

export default function Breadcrumbs() {
  const location = useLocation()
  const pathnames = location.pathname.split('/').filter(x => x)

  // Don't show breadcrumbs on homepage
  if (pathnames.length === 0) {
    return null
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        <li className="breadcrumbs__item">
          <Link to="/" className="breadcrumbs__link">
            🏠 Home
          </Link>
        </li>
        {pathnames.map((segment, index) => {
          const path = `/${pathnames.slice(0, index + 1).join('/')}`
          const isLast = index === pathnames.length - 1
          const label = routeLabels[segment] || segment
          // Sales list is at /parts-sale; /sales/:id is detail only
          const linkPath = segment === 'sales' && !isLast ? '/parts-sale' : path

          if (/^\d+$/.test(segment)) {
            return (
              <li key={path} className="breadcrumbs__item">
                <span className="breadcrumbs__separator">/</span>
                <span className="breadcrumbs__current">Details</span>
              </li>
            )
          }

          return (
            <li key={path} className="breadcrumbs__item">
              <span className="breadcrumbs__separator">/</span>
              {isLast ? (
                <span className="breadcrumbs__current">{label}</span>
              ) : (
                <Link to={linkPath} className="breadcrumbs__link">
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
