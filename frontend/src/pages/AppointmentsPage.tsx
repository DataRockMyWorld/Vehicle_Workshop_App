import { useCallback, useEffect, useState } from 'react'
import { appointments, customers, vehicles, sites, mechanics } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { usePagination } from '../hooks/usePagination'
import { useAsyncData } from '../hooks/useAsyncData'
import Pagination from '../components/Pagination'
import PageError from '../components/PageError'
import type { Appointment, Customer, Vehicle, Site } from '../types'

interface Mechanic {
  id: number
  name?: string
  site?: number
  [key: string]: unknown
}
import Loader from '../components/Loader'
import './GenericListPage.css'

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
]

export default function AppointmentsPage() {
  const { canWrite, siteId: userSiteId } = useAuth()
  const { data: rawData, loading, error, refetch } = useAsyncData(
    () => Promise.all([
      appointments.list(),
      customers.list(),
      vehicles.list(),
      sites.list(),
      mechanics.list(),
    ]),
    []
  )
  const [list, customersList, vehiclesList, sitesList, mechanicsList] = rawData
    ? [
        toList(rawData[0]) as Appointment[],
        toList(rawData[1]) as Customer[],
        toList(rawData[2]) as Vehicle[],
        toList(rawData[3]) as Site[],
        toList(rawData[4]) as Mechanic[],
      ]
    : [[], [], [], [], []]
  const load = useCallback(() => refetch(), [refetch])

  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [siteId, setSiteId] = useState(userSiteId ? String(userSiteId) : '')
  const [mechanicId, setMechanicId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [durationMinutes, setDurationMinutes] = useState<number | string>(60)
  const [status, setStatus] = useState('scheduled')
  const [notes, setNotes] = useState('')

  const vehiclesForCustomer = customerId
    ? (vehiclesList || []).filter((v) => String(v.customer) === String(customerId))
    : []

  useEffect(() => {
    if (!customerId) setVehicleId('')
  }, [customerId])
  useEffect(() => {
    if (userSiteId) setSiteId(String(userSiteId))
  }, [userSiteId])

  const { paginatedItems, currentPage, totalPages, pageSize, setPage, setPageSize } = usePagination(list, 10)

  const byId = <T extends { id: number }>(arr: T[]) => Object.fromEntries((arr || []).map((x) => [x.id, x]))
  const cMap = byId(customersList)
  const vMap = byId(vehiclesList)
  const sMap = byId(sitesList)
  const mMap = byId(mechanicsList)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!customerId || !vehicleId || !siteId || !scheduledDate || !scheduledTime) {
      setFormError('Customer, vehicle, site, date, and time are required.')
      return
    }
    setSubmitting(true)
    try {
      await appointments.create({
        customer: parseInt(customerId, 10),
        vehicle: parseInt(vehicleId, 10),
        site: parseInt(siteId, 10),
        mechanic: mechanicId ? parseInt(mechanicId, 10) : null,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        duration_minutes: (typeof durationMinutes === 'number' ? durationMinutes : parseInt(String(durationMinutes), 10)) || 60,
        status,
        notes: notes.trim() || '',
      })
      setCustomerId('')
      setVehicleId('')
      setSiteId(userSiteId ? String(userSiteId) : '')
      setMechanicId('')
      setScheduledDate('')
      setScheduledTime('09:00')
      setDurationMinutes(60)
      setStatus('scheduled')
      setNotes('')
      setShowForm(false)
      load()
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  const fmtDate = (d: string | undefined) => {
    if (!d) return '—'
    const x = new Date(d)
    return x.toLocaleDateString()
  }
  const fmtTime = (t: string | undefined) => {
    if (!t) return '—'
    return String(t).slice(0, 5)
  }

  return (
    <div className="generic-list">
      <div className="page-header">
        <h1 className="page-title">Appointments</h1>
        {canWrite && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
          >
            {showForm ? 'Cancel' : 'Book appointment'}
          </button>
        )}
      </div>

      {error && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <PageError error={error} onRetry={load} />
        </div>
      )}

      {!error && showForm && canWrite && (
        <form className="card generic-list__form" onSubmit={handleSubmit}>
          <h2 className="generic-list__form-title">Book appointment</h2>
          {formError && <p className="generic-list__form-error">{formError}</p>}
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="ap-customer">Customer</label>
              <select id="ap-customer" className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">Select customer</option>
                {(customersList || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ap-vehicle">Vehicle</label>
              <select id="ap-vehicle" className="select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                <option value="">Select vehicle</option>
                {vehiclesForCustomer.map((v) => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} ({v.license_plate})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Site</label>
              {userSiteId ? (
                <div className="form-readonly">{(sMap as Record<number, Site>)[userSiteId!]?.name ?? `Site #${userSiteId}`}</div>
              ) : (
                <select id="ap-site" className="select" value={siteId} onChange={(e) => setSiteId(e.target.value)} required>
                  <option value="">Select site</option>
                  {(sitesList || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ap-mechanic">Mechanic (optional)</label>
              <select id="ap-mechanic" className="select" value={mechanicId} onChange={(e) => setMechanicId(e.target.value)}>
                <option value="">None</option>
                {(mechanicsList || []).filter((m) => !siteId || m.site === parseInt(siteId, 10)).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="ap-date">Date</label>
              <input id="ap-date" type="date" className="input" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ap-time">Time</label>
              <input id="ap-time" type="time" className="input" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ap-duration">Duration (min)</label>
              <input id="ap-duration" type="number" className="input" min="15" step="15" value={String(durationMinutes)} onChange={(e) => setDurationMinutes(e.target.value || 60)} />
            </div>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="ap-notes">Notes</label>
            <textarea id="ap-notes" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Book'}
          </button>
        </form>
      )}

      {!error && (
      <div className="card table-wrap">
        {loading ? (
          <Loader label="Loading appointments…" />
        ) : list.length === 0 ? (
          <div className="empty">No appointments. Book one to get started.</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Site</th>
                  <th>Mechanic</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDate(a.scheduled_date)}</td>
                    <td>{fmtTime(a.scheduled_time)}</td>
                    <td>{cMap[a.customer] ? `${cMap[a.customer].first_name} ${cMap[a.customer].last_name}` : `#${a.customer}`}</td>
                    <td>{vMap[a.vehicle] ? `${vMap[a.vehicle].make} ${vMap[a.vehicle].model}` : `#${a.vehicle}`}</td>
                    <td>{sMap[a.site] ? sMap[a.site].name : `#${a.site}`}</td>
                    <td>{a.mechanic && mMap[a.mechanic] ? mMap[a.mechanic].name : '—'}</td>
                    <td>
                      <span className={`badge badge--${(a.status || '').replace('_', '-')}`}>
                        {STATUS_OPTIONS.find((o) => o.value === a.status)?.label || a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={list.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          </>
        )}
      </div>
      )}
    </div>
  )
}
