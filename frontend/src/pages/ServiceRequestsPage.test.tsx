import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ServiceRequestsPage from './ServiceRequestsPage'
import { serviceRequests, customers, vehicles, sites } from '../api/services'

vi.mock('../api/services', () => ({
  serviceRequests: { list: vi.fn() },
  customers: { list: vi.fn() },
  vehicles: { list: vi.fn() },
  sites: { list: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ canWrite: true }),
}))

describe('ServiceRequestsPage', () => {
  beforeEach(() => {
    vi.mocked(serviceRequests.list).mockResolvedValue([
      { id: 1, service_type_display: 'Oil Change', customer: 1, vehicle: 1, site: 1, status: 'Pending' },
    ])
    vi.mocked(customers.list).mockResolvedValue([{ id: 1, first_name: 'John', last_name: 'Doe' }])
    vi.mocked(vehicles.list).mockResolvedValue([{ id: 1, make: 'Toyota', model: 'Camry' }])
    vi.mocked(sites.list).mockResolvedValue([{ id: 1, name: 'Main Site' }])
  })

  it('shows loading state initially', () => {
    vi.mocked(serviceRequests.list).mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <ServiceRequestsPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows table with service requests when data loads', async () => {
    render(
      <MemoryRouter>
        <ServiceRequestsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument()
    })

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Oil Change')).toBeInTheDocument()
  })

  it('shows PageError with retry when fetch fails', async () => {
    vi.mocked(serviceRequests.list).mockRejectedValue(new Error('Network error'))

    render(
      <MemoryRouter>
        <ServiceRequestsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/try again/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
