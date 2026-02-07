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

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const obj = err as { detail?: string | string[]; status?: number; email?: string[]; password?: string[] }
      const d = obj.detail
      const msg = obj.status === 429
        ? 'Too many login attempts. Please try again in a minute.'
        : (Array.isArray(d) ? d[0] : (typeof d === 'string' ? d : null) ?? obj.email?.[0] ?? obj.password?.[0] ?? 'Login failed. Check email and password.')
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
      <div className="login__container">
      <div className="login__brand">
        <div className="login__brand-inner">
          <div className="login__logo-wrap">
            <img
              src="/logo.png"
              alt="Feeling Autopart"
              className="login__logo"
            />
          </div>
          <h1 className="login__brand-title">Feeling Autopart</h1>
          <p className="login__brand-tagline">Workshop Management System</p>
          <div className="login__brand-accent" aria-hidden="true" />
        </div>
      </div>

      <div className="login__form-section">
        <div className="login__card">
          <h2 className="login__form-title">Welcome back</h2>
          <p className="login__form-subtitle">Sign in to your account</p>

          <form className="login__form" onSubmit={handleSubmit}>
            {error && (
              <div className="login__error" role="alert">
                {error}
              </div>
            )}

            <label className="login__label">
              <span className="login__label-text">Email</span>
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
              <span className="login__label-text">Password</span>
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
      </div>
    </div>
  )
}
