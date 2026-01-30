import { useEffect, useState } from 'react'
import { mechanics, sites } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { apiErrorMsg, toList } from '../api/client'
import './GenericListPage.css'

export default function MechanicsPage() {
  const { canWrite } = useAuth()
  const [list, setList] = useState([])
  const [sitesList, setSitesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone_number, setPhone_number] = useState('')
  const [site, setSite] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([mechanics.list(), sites.list()])
      .then(([m, s]) => {
        setList(toList(m))
        setSitesList(toList(s))
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const byId = (arr, id) => (arr || []).find((x) => x.id === parseInt(id, 10))
  const siteName = (id) => {
    const s = byId(sitesList, id)
    return s ? s.name : `#${id}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!name.trim() || !site) {
      setFormError('Name and site are required.')
      return
    }
    setSubmitting(true)
    try {
      await mechanics.create({
        name: name.trim(),
        phone_number: phone_number.trim() || '',
        site: parseInt(site, 10),
      })
      setName('')
      setPhone_number('')
      setSite('')
      setShowForm(false)
      load()
    } catch (e) {
      setFormError(apiErrorMsg(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="generic-list">
      <div className="page-header">
        <h1 className="page-title">Mechanics</h1>
        {canWrite && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
          >
            {showForm ? 'Cancel' : 'Add mechanic'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="form-card card" onSubmit={handleSubmit}>
          <h2 className="form-card__title">New mechanic</h2>
          {formError && <div className="form-card__error" role="alert">{formError}</div>}
          <div className="form-card__grid">
            <div className="form-group">
              <label className="label" htmlFor="mec-name">Name</label>
              <input
                id="mec-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="mec-phone">Phone</label>
              <input
                id="mec-phone"
                type="tel"
                className="input"
                value={phone_number}
                onChange={(e) => setPhone_number(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="mec-site">Site</label>
              <select
                id="mec-site"
                className="select"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                required
              >
                <option value="">Select site</option>
                {(sitesList || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-card__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {error && <div className="generic-list__error">{apiErrorMsg(error)}</div>}
      <div className="card table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty">No mechanics yet. Use “Add mechanic” to create one.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.phone_number || '—'}</td>
                  <td>{siteName(r.site)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
