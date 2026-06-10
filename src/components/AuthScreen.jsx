import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { track } from '../lib/analytics.js'
import { IconFridge } from '../icons.jsx'

// Sign in / create account. Shown (in place of the app) when accounts are
// enabled and nobody is signed in. Email + password to keep it simple and
// dependency-free; social sign-in can be layered on later.
export default function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [checkEmail, setCheckEmail] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setError(null)
    setBusy(true)
    try {
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
          <button className="btn btn-ghost btn-block" onClick={() => { setCheckEmail(false); setMode('signin') }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <motion.form
        className="auth-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <div className="auth-brand">
          <IconFridge size={26} />
        </div>
        <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p>{mode === 'signup' ? 'So your fridge syncs and stays yours.' : 'Sign in to your fridge.'}</p>

        <label className="auth-label" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          className="input"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <label className="auth-label" htmlFor="auth-pass">Password</label>
        <input
          id="auth-pass"
          className="input"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>

        <button
          type="button"
          className="btn-text auth-switch"
          onClick={() => { setError(null); setMode(mode === 'signup' ? 'signin' : 'signup') }}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>

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
  return m || 'Something went wrong. Please try again.'
}
