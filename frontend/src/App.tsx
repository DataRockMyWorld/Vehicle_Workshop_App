import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Loader from './components/Loader'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ServiceRequestsPage from './pages/ServiceRequestsPage'
import ServiceRequestDetailPage from './pages/ServiceRequestDetailPage'
import ServiceRequestCreatePage from './pages/ServiceRequestCreatePage'
import PartsSalePage from './pages/PartsSalePage'
import PartsSaleCreatePage from './pages/PartsSaleCreatePage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import VehiclesPage from './pages/VehiclesPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import MechanicsPage from './pages/MechanicsPage'
import MechanicDetailPage from './pages/MechanicDetailPage'
import SitesPage from './pages/SitesPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import InvoicesPage from './pages/InvoicesPage'
import AppointmentsPage from './pages/AppointmentsPage'
import AuditTrailPage from './pages/AuditTrailPage'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="app-loading"><Loader size="large" label="Loading…" /></div>
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="service-requests" element={<ServiceRequestsPage />} />
          <Route path="service-requests/new" element={<ServiceRequestCreatePage />} />
          <Route path="service-requests/:id" element={<ServiceRequestDetailPage />} />
          <Route path="parts-sale" element={<PartsSalePage />} />
          <Route path="parts-sale/new" element={<PartsSaleCreatePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="mechanics" element={<MechanicsPage />} />
          <Route path="mechanics/:id" element={<MechanicDetailPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="audit" element={<AuditTrailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
