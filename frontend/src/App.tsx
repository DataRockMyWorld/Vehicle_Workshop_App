import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useLoadingBar } from './hooks/useLoadingBar'
import { useMultiTabSync } from './hooks/useMultiTabSync'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Loader from './components/Loader'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LaunchpadPage from './pages/LaunchpadPage'
import ServiceRequestsPage from './pages/ServiceRequestsPage'
import ServiceRequestDetailPage from './pages/ServiceRequestDetailPage'
import SaleDetailPage from './pages/SaleDetailPage'
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
import AuditTrailPage from './pages/AuditTrailPage'
import SalesReportPage from './pages/SalesReportPage'
import PromotionsPage from './pages/PromotionsPage'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="app-loading"><Loader size="large" label="Loading…" /></div>
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export default function App() {
  useLoadingBar()
  useMultiTabSync()

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
          <Route index element={<LaunchpadPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="service-requests" element={<ServiceRequestsPage />} />
          <Route path="service-requests/new" element={<ServiceRequestCreatePage />} />
          <Route path="service-requests/:id" element={<ServiceRequestDetailPage />} />
          <Route path="sales/:id" element={<SaleDetailPage />} />
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
          <Route path="reports/sales" element={<SalesReportPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="audit" element={<AuditTrailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
