import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { track } from '../lib/analytics.js'
import { IconFridge } from '../icons.jsx'

// Loose but sane email shape check — enough to catch a blank/obviously-wrong
// address before we bother the server, not a full RFC validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isEmail = (v) => EMAIL_RE.test(String(v).trim())

// Sign in / create account / reset password. Shown (in place of the app) when
// accounts are enabled and nobody is signed in. Email + password to keep it
// simple and dependency-free; social sign-in can be layered on later.
export default function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Per-field validation messages, only shown once a field has been touched so
  // we don't shout at someone who's just landed on the form.
  const [fieldErr, setFieldErr] = useState({})
  const [checkEmail, setCheckEmail] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Validate up front so the button can't silently no-op. Returns the error map.
  function validate() {
    const errs = {}
    if (!email.trim()) errs.email = 'Enter your email.'
    else if (!isEmail(email)) errs.email = 'That doesn’t look like an email address.'
    if (mode !== 'forgot') {
      if (!password) errs.password = 'Enter your password.'
      else if (mode === 'signup' && password.length < 6) errs.password = 'Use at least 6 characters.'
    }
    return errs
  }

  async function submit(e) {
    e.preventDefault()
    const errs = validate()
    setFieldErr(errs)
    if (Object.keys(errs).length) return
    setError(null)
    setBusy(true)
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`
        })
        if (error) throw error
        setResetSent(true)
        return
      }
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        track('signup') // conversion: a new account was created
        // If the project requires email confirmation there's no session yet.
        if (!data.session) {
          setCheckEmail(true)
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
      // On success, the auth listener in useAuth swaps this screen for the app.
    } catch (err) {
      setError(prettyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next) {
    setError(null)
    setFieldErr({})
    setMode(next)
  }

  if (checkEmail) {
    return (
      <div className="auth">
        <div className="auth-card">
          <div className="auth-brand">
            <IconFridge size={26} />
          </div>
          <h1>Check your email</h1>
          <p>
            We sent a confirmation link to <strong>{email.trim()}</strong>. Tap it to finish creating your
            account, then come back and sign in.
          </p>
          <button className="btn btn-ghost btn-block" onClick={() => { setCheckEmail(false); switchMode('signin') }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  if (resetSent) {
    return (
      <div className="auth">
        <div className="auth-card">
          <div className="auth-brand">
            <IconFridge size={26} />
          </div>
          <h1>Check your email</h1>
          <p>
            If <strong>{email.trim()}</strong> has an account, we’ve sent a link to reset your password. Open
            it on this device and you can set a new one.
          </p>
          <button className="btn btn-ghost btn-block" onClick={() => { setResetSent(false); switchMode('signin') }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'
  const sub =
    mode === 'signup'
      ? 'So your fridge syncs and stays yours.'
      : mode === 'forgot'
        ? 'Enter your email and we’ll send a reset link.'
        : 'Sign in to your fridge.'

  return (
    <div className="auth">
      <motion.form
        className="auth-card"
        onSubmit={submit}
        noValidate
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <div className="auth-brand">
          <IconFridge size={26} />
        </div>
        <h1>{title}</h1>
        <p>{sub}</p>

        <label className="auth-label" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          className={`input ${fieldErr.email ? 'input-error' : ''}`}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (fieldErr.email) setFieldErr((f) => ({ ...f, email: null })) }}
          placeholder="you@example.com"
          aria-invalid={!!fieldErr.email}
        />
        {fieldErr.email && <p className="auth-field-error">{fieldErr.email}</p>}

        {mode !== 'forgot' && (
          <>
            <label className="auth-label" htmlFor="auth-pass">Password</label>
            <input
              id="auth-pass"
              className={`input ${fieldErr.password ? 'input-error' : ''}`}
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (fieldErr.password) setFieldErr((f) => ({ ...f, password: null })) }}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              aria-invalid={!!fieldErr.password}
            />
            {fieldErr.password && <p className="auth-field-error">{fieldErr.password}</p>}
          </>
        )}

        {mode === 'signin' && (
          <button type="button" className="btn-text auth-forgot" onClick={() => switchMode('forgot')}>
            Forgot password?
          </button>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy
            ? 'One moment…'
            : mode === 'signup'
              ? 'Create account'
              : mode === 'forgot'
                ? 'Send reset link'
                : 'Sign in'}
        </button>

        {mode === 'forgot' ? (
          <button type="button" className="btn-text auth-switch" onClick={() => switchMode('signin')}>
            Back to sign in
          </button>
        ) : (
          <button
            type="button"
            className="btn-text auth-switch"
            onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
          >
            {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </button>
        )}

        <p className="auth-legal">
          By continuing you agree to our{' '}
          <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms</a> and{' '}
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>
      </motion.form>
    </div>
  )
}

function prettyAuthError(err) {
  const m = err?.message || ''
  if (/invalid login credentials/i.test(m)) return 'That email or password isn’t right.'
  if (/already registered/i.test(m)) return 'That email already has an account — try signing in.'
  if (/password should be at least/i.test(m)) return 'Password needs to be at least 6 characters.'
  if (/rate limit|too many/i.test(m)) return 'Too many attempts just now — please wait a minute and try again.'
  return m || 'Something went wrong. Please try again.'
}
