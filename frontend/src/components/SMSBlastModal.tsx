import { useCallback, useEffect, useState } from 'react'
import { promotions, sites } from '../api/services'
import { apiErrorMsg, toList } from '../api/client'
import './CompleteSaleModal.css'

const SMS_MAX_CHARS = 160
const AUDIENCE_ALL = 'all'
const AUDIENCE_OPT_IN = 'opt_in'
const AUDIENCE_SITE = 'site'

interface Promotion {
  id: number
  title: string
  description?: string
}

interface Site {
  id: number
  name: string
}

interface SMSBlastModalProps {
  isOpen: boolean
  onClose: () => void
  onSent: () => void
  promotion: Promotion
  canSeeAllSites: boolean
}

export default function SMSBlastModal({
  isOpen,
  onClose,
  onSent,
  promotion,
  canSeeAllSites,
}: SMSBlastModalProps) {
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState(AUDIENCE_ALL)
  const [siteId, setSiteId] = useState<string>('')
  const [sitesList, setSitesList] = useState<Site[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const charCount = message.length
  const segments = Math.ceil(charCount / SMS_MAX_CHARS) || 1
  const previewText = message.replace(/\{first_name\}/g, 'John').trim() || message

  const fetchPreview = useCallback(async () => {
    if (!message.trim()) {
      setTotalCount(null)
      return
    }
    setLoadingPreview(true)
    setError('')
    try {
      const params: { audience: string; site_id?: number } = { audience }
      if (audience === AUDIENCE_SITE && siteId) params.site_id = parseInt(siteId, 10)
      const res = await promotions.smsBlastPreview(promotion.id, params)
      setTotalCount(res.total_count)
    } catch (e) {
      setError(apiErrorMsg(e))
      setTotalCount(null)
    } finally {
      setLoadingPreview(false)
    }
  }, [promotion.id, message, audience, siteId])

  useEffect(() => {
    if (isOpen) {
      setMessage(`${promotion.title}\n\n${promotion.description || ''}`.trim())
      setAudience(AUDIENCE_ALL)
      setSiteId('')
      setTotalCount(null)
      setError('')
    }
  }, [isOpen, promotion.title, promotion.description])

  useEffect(() => {
    if (!isOpen) return
    if (canSeeAllSites && sitesList.length === 0) {
      sites.list().then((r) => setSitesList(toList(r ?? null)))
    }
  }, [isOpen, canSeeAllSites, sitesList.length])

  useEffect(() => {
    const t = setTimeout(fetchPreview, 400)
    return () => clearTimeout(t)
  }, [fetchPreview])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Message is required.')
      return
    }
    if (audience === AUDIENCE_SITE && !siteId) {
      setError('Please select a site.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const body: { message: string; audience: string; site_id?: number } = {
        message: message.trim(),
        audience,
      }
      if (audience === AUDIENCE_SITE && siteId) body.site_id = parseInt(siteId, 10)
      await promotions.smsBlast(promotion.id, body)
      onSent()
      onClose()
    } catch (e) {
      setError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sms-blast-title">
      <div className="modal-content modal-content--medium">
        <div className="modal-header">
          <h2 id="sms-blast-title" className="modal-title">
            Send SMS blast — {promotion.title}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="complete-sale">
            {error && (
              <div className="alert alert--error" role="alert">
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="label" htmlFor="sms-message">
                Message
              </label>
              <textarea
                id="sms-message"
                className="input"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Use {first_name} for personalization"
                maxLength={480}
              />
              <span className="text-muted">
                {charCount} / {SMS_MAX_CHARS} chars · {segments} SMS segment{segments > 1 ? 's' : ''}
              </span>
            </div>
            <div className="form-group">
              <label className="label">Audience</label>
              <select
                className="input"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value={AUDIENCE_ALL}>All customers</option>
                <option value={AUDIENCE_OPT_IN}>Opt-in only (service reminders)</option>
                {canSeeAllSites && <option value={AUDIENCE_SITE}>Site-specific</option>}
              </select>
            </div>
            {audience === AUDIENCE_SITE && canSeeAllSites && (
              <div className="form-group">
                <label className="label" htmlFor="sms-site">Site</label>
                <select
                  id="sms-site"
                  className="input"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                >
                  <option value="">Select site</option>
                  {sitesList.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="complete-sale__section">
              <h3 className="complete-sale__section-title">Preview</h3>
              <div
                className="complete-sale__totals"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {previewText || '(empty)'}
              </div>
            </div>
            <div className="complete-sale__totals">
              {loadingPreview ? (
                <span className="text-muted">Counting recipients…</span>
              ) : totalCount !== null ? (
                <p style={{ margin: 0 }}>
                  <strong>{totalCount}</strong> customer{totalCount !== 1 ? 's' : ''} will receive this message.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary btn--large"
            onClick={handleSend}
            disabled={submitting || !message.trim() || (audience === AUDIENCE_SITE && !siteId)}
          >
            {submitting ? 'Sending…' : 'Send SMS'}
          </button>
        </div>
      </div>
    </div>
  )
}
