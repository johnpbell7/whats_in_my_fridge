import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { IconFridge } from '../icons.jsx'

// Shown after a user follows the "reset password" email link. At this point
// Supabase has put them in a temporary recovery session, so all we need is the
// new password — updateUser sets it and signs them in for real.
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (password.length < 6) return setError('Use at least 6 characters.')
    if (password !== confirm) return setError('Those passwords don’t match.')
    setError(null)
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      // Done — drop the recovery flag so the app shows normally (now signed in).
      onDone?.()
    } catch (err) {
      setError(err?.message || 'Couldn’t update your password. Please try again.')
      setBusy(false)
    }
  }

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
        <h1>Set a new password</h1>
        <p>Choose a new password for your account.</p>

        <label className="auth-label" htmlFor="reset-pass">New password</label>
        <input
          id="reset-pass"
          className="input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />

        <label className="auth-label" htmlFor="reset-confirm">Confirm password</label>
        <input
          id="reset-confirm"
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type it again"
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </motion.form>
    </div>
  )
}
