import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname ?? '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      const d = err.detail
      const msg = err.status === 429
        ? 'Too many login attempts. Please try again in a minute.'
        : (Array.isArray(d) ? d[0] : (typeof d === 'string' ? d : null) ?? err.email?.[0] ?? err.password?.[0] ?? 'Login failed. Check email and password.')
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  if (isAuthenticated) {
    navigate(from, { replace: true })
    return null
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__header">
          <div className="login__logo" aria-hidden="true" />
          <h1 className="login__title">Workshop Management</h1>
          <p className="login__subtitle">Sign in to continue</p>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          {error && (
            <div className="login__error" role="alert">
              {error}
            </div>
          )}

          <label className="login__label">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="login__input"
              required
            />
          </label>

          <label className="login__label">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="login__input"
              required
            />
          </label>

          <button
            type="submit"
            className="login__submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login__footer">
          Use your workshop account credentials.
        </p>
      </div>
    </div>
  )
}
