import { useCallback, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { promotions, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg, toList } from '../api/client'
import { useAsyncData } from '../hooks/useAsyncData'
import PageError from '../components/PageError'
import SMSBlastModal from '../components/SMSBlastModal'
import './GenericListPage.css'
import './PromotionsPage.css'

interface Promotion {
  id: number
  title: string
  description?: string
  start_date: string
  end_date: string
  discount_percent?: number
  discount_amount?: number
}

interface SMSBlastRecord {
  id: number
  promotion: number
  promotion_title?: string
  message: string
  audience: string
  total_count: number
  sent_count: number
  created_at: string
}

export default function PromotionsPage() {
  const { canSeeAllSites } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [smsPromotion, setSmsPromotion] = useState<Promotion | null>(null)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    discount_percent: '',
    discount_amount: '',
  })

  const fetchList = useCallback(async () => {
    try {
      return await promotions.list()
    } catch (e: unknown) {
      const err = e as { status?: number }
      if (err?.status === 404) {
        return await promotions.active()
      }
      throw e
    }
  }, [])
  const fetchHistory = useCallback(async () => {
    try {
      return await promotions.smsHistory()
    } catch {
      return []
    }
  }, [])
  const { data: rawList, loading, error, refetch } = useAsyncData(fetchList, [])
  const { data: rawHistory, refetch: refetchHistory } = useAsyncData(fetchHistory, [smsPromotion])

  const list = (rawList ? toList(rawList) : []) as Promotion[]
  const history = (rawHistory ? toList(rawHistory) : []) as SMSBlastRecord[]
  const load = useCallback(() => {
    refetch()
    refetchHistory()
  }, [refetch, refetchHistory])

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      discount_percent: '',
      discount_amount: '',
    })
    setShowForm(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim()) {
      setFormError('Title is required.')
      return
    }
    if (!form.start_date || !form.end_date) {
      setFormError('Start and end dates are required.')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
      }
      if (form.discount_percent) body.discount_percent = parseFloat(form.discount_percent)
      if (form.discount_amount) body.discount_amount = parseFloat(form.discount_amount)
      if (editingId) {
        await promotions.update(editingId, body)
      } else {
        await promotions.create(body)
      }
      resetForm()
      load()
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (p: Promotion) => {
    setEditingId(p.id)
    setForm({
      title: p.title,
      description: p.description || '',
      start_date: p.start_date,
      end_date: p.end_date,
      discount_percent: p.discount_percent != null ? String(p.discount_percent) : '',
      discount_amount: p.discount_amount != null ? String(p.discount_amount) : '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this promotion?')) return
    try {
      await promotions.delete(id)
      load()
      if (editingId === id) resetForm()
    } catch (e) {
      setFormError(apiErrorMsg(e))
    }
  }

  const handleSmsSent = () => {
    refetchHistory()
  }

  if (!canSeeAllSites) return <Navigate to="/" replace />

  return (
    <div className="generic-list promotions-page">
      <div className="page-header">
        <h1 className="page-title">Promotions</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
          aria-expanded={showForm}
        >
          {showForm && !editingId ? 'Cancel' : 'Add promotion'}
        </button>
      </div>

      {showForm && (
        <form className="form-card card" onSubmit={handleSubmit}>
          <h2 className="form-card__title">{editingId ? 'Edit promotion' : 'New promotion'}</h2>
          {formError && (
            <div className="form-card__error" role="alert">
              {formError}
            </div>
          )}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="promo-title">
                Title
              </label>
              <input
                id="promo-title"
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label" htmlFor="promo-desc">
                Description
              </label>
              <textarea
                id="promo-desc"
                className="input"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="promo-start">
                Start date
              </label>
              <input
                id="promo-start"
                type="date"
                className="input"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="promo-end">
                End date
              </label>
              <input
                id="promo-end"
                type="date"
                className="input"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="promo-pct">
                Discount %
              </label>
              <input
                id="promo-pct"
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="input"
                placeholder="e.g. 10"
                value={form.discount_percent}
                onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="promo-amt">
                Discount amount
              </label>
              <input
                id="promo-amt"
                type="number"
                min="0"
                step="0.01"
                className="input"
                placeholder="e.g. 50"
                value={form.discount_amount}
                onChange={(e) => setForm((f) => ({ ...f, discount_amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-card__actions">
            <button type="button" className="btn btn--secondary" onClick={resetForm}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <PageError error={error} onRetry={load} />
        </div>
      )}

      {!error && (
        <>
          <div className="card table-wrap">
            {loading ? (
              <div className="empty">Loading…</div>
            ) : list.length === 0 ? (
              <div className="empty">No promotions yet. Use “Add promotion” to create one.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Period</th>
                    <th>Discount</th>
                    <th style={{ width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.title}</strong>
                        {p.description && (
                          <div className="promotions-page__desc">{p.description.slice(0, 80)}{p.description.length > 80 ? '…' : ''}</div>
                        )}
                      </td>
                      <td>
                        {p.start_date} – {p.end_date}
                      </td>
                      <td>
                        {p.discount_percent != null && p.discount_percent > 0
                          ? `${p.discount_percent}% off`
                          : p.discount_amount != null && parseFloat(String(p.discount_amount)) > 0
                          ? `GH₵${p.discount_amount} off`
                          : '—'}
                      </td>
                      <td>
                        <div className="promotions-page__actions">
                          <button
                            type="button"
                            className="btn btn--small btn--secondary"
                            onClick={() => handleEdit(p)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn--small btn--primary"
                            onClick={() => setSmsPromotion(p)}
                          >
                            Send SMS
                          </button>
                          <button
                            type="button"
                            className="btn btn--small btn--danger"
                            onClick={() => handleDelete(p.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {history.length > 0 && (
            <section className="card">
              <h2 className="promotions-page__history-title">SMS blast history</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Promotion</th>
                    <th>Audience</th>
                    <th>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.created_at).toLocaleString()}</td>
                      <td>{h.promotion_title ?? '—'}</td>
                      <td>{h.audience}</td>
                      <td>
                        {h.sent_count} / {h.total_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {smsPromotion && (
        <SMSBlastModal
          isOpen={!!smsPromotion}
          onClose={() => setSmsPromotion(null)}
          onSent={handleSmsSent}
          promotion={smsPromotion}
          canSeeAllSites={canSeeAllSites}
        />
      )}
    </div>
  )
}
