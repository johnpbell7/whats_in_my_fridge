import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { useSheet } from '../lib/useSheet.js'
import { getMe, deleteAccount, openBillingPortal } from '../lib/api.js'
import { upgrade } from '../lib/upgrade.js'
import { store } from '../lib/store.js'
import { shopping } from '../lib/shopping.js'
import { staplePrefs } from '../lib/staples.js'
import { DIET_OPTIONS, AVOID_OPTIONS } from '../lib/diet.js'
import { savedMeals } from '../lib/meals.js'
import { IconClose, IconUser, IconSparkle } from '../icons.jsx'

// Bottom-sheet account panel: who you are, your plan, this month's usage
// against your limits, and sign out.
export default function AccountSheet({ onClose, onReport }) {
  const [me, setMe] = useState(null)
  const [err, setErr] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalErr, setPortalErr] = useState(null)
  const loading = !me && !err
  const sheetRef = useSheet(onClose)

  async function manageSubscription() {
    if (portalBusy) return
    setPortalBusy(true)
    setPortalErr(null)
    try {
      const { url } = await openBillingPortal()
      if (url) window.location.href = url
      else setPortalErr('Couldn’t open billing settings. Please try again.')
    } catch (e) {
      setPortalErr(e?.message || 'Couldn’t open billing settings. Please try again.')
    } finally {
      setPortalBusy(false)
    }
  }

  useEffect(() => {
    getMe().then(setMe).catch(() => setErr(true))
  }, [])

  // Download everything we hold for this user as a JSON file (GDPR data export).
  // The local stores mirror the synced cloud data, so this is the full picture.
  function exportData() {
    const data = {
      exported_at: new Date().toISOString(),
      account: me ? { email: me.email, tier: me.tier } : null,
      inventory: store.getAll(),
      shopping: shopping.getAll(),
      staple_prefs: staplePrefs.getAll(),
      saved_meals: savedMeals.getAll()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whats-in-my-fridge-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function removeAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    setDeleteErr(null)
    try {
      await deleteAccount()
      // Account is gone server-side; sign out clears the session, which makes
      // the app drop to the login screen and wipes the local copy.
      await supabase.auth.signOut()
    } catch (e) {
      setDeleting(false)
      setConfirmDelete(false)
      setDeleteErr(e.message || 'Could not delete your account. Please try again.')
    }
  }

  return (
    <div className="scrim" onClick={onClose}>
      <motion.div
        className="sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-sheet-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2 id="account-sheet-title">Account</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        <div className="account-id">
          <span className="account-avatar"><IconUser size={22} /></span>
          <div>
            <div className={`account-email ${loading ? 'is-loading' : ''}`}>
              {me?.email || (loading ? '' : 'Signed in')}
            </div>
            <div className="account-tier">{me ? me.tierLabel : 'Your plan'}</div>
          </div>
        </div>

        {me?.trial && (
          <p className="account-trial">
            ✨ Your Plus trial — {me.trialDaysLeft} {me.trialDaysLeft === 1 ? 'day' : 'days'} left. Subscribe to keep it.
          </p>
        )}

        {/* Usage section is always rendered (skeleton while loading) so the
            sheet holds its size instead of growing as data arrives. */}
        <div className="account-usage">
          <UsageBar label="Photo scans" used={me?.usage?.scans.used} limit={me?.usage?.scans.limit} loading={loading} />
          <UsageBar label="Chat questions" used={me?.usage?.chats.used} limit={me?.usage?.chats.limit} loading={loading} />
          <p className="account-note">
            {err ? 'Couldn’t load your usage just now.' : 'Resets at the start of each month.'}
          </p>
        </div>

        {loading ? (
          <div className="btn btn-block upgrade-cta skeleton-btn" aria-hidden="true" />
        ) : me && !me.paid ? (
          <button className="btn btn-primary btn-block upgrade-cta" onClick={() => upgrade.show('account')}>
            <IconSparkle size={18} /> {me.trial ? 'Keep Plus — £3.99/month' : 'Upgrade to Plus — £3.99/month'}
          </button>
        ) : (
          me &&
          me.paid && (
            <button className="btn btn-ghost btn-block upgrade-cta" onClick={manageSubscription} disabled={portalBusy}>
              {portalBusy ? 'Opening…' : 'Manage subscription'}
            </button>
          )
        )}

        {portalErr && <p className="account-note account-note-err">{portalErr}</p>}

        <DietSection />

        <CredentialsSection currentEmail={me?.email} />

        <button className="btn btn-ghost btn-block" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>

        {onReport && (
          <button className="btn-text account-report" onClick={onReport}>
            Report a problem
          </button>
        )}

        <div className="account-data">
          <button className="btn-text" onClick={exportData}>
            Export my data
          </button>
          <span aria-hidden="true" className="account-data-sep"> · </span>
          <button
            className={`btn-text ${confirmDelete ? 'danger' : ''}`}
            onClick={removeAccount}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to permanently delete' : 'Delete account'}
          </button>
        </div>
        {deleteErr && <p className="account-note account-data-err">{deleteErr}</p>}

        <p className="account-legal">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a>
          <span aria-hidden="true"> · </span>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms</a>
          <span aria-hidden="true"> · </span>
          <a href="mailto:hello.whatsinmyfridge@gmail.com">Contact</a>
        </p>
      </motion.div>
    </div>
  )
}

// Manage sign-in credentials: change email (Supabase emails a confirmation to
// the new address) and change password (applied straight away — the live
// session authorises it, no re-entry of the old one needed).
function CredentialsSection({ currentEmail }) {
  const [open, setOpen] = useState(null) // null | 'email' | 'password'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  function start(which) {
    setMsg(null)
    setEmail('')
    setPassword('')
    setOpen(open === which ? null : which)
  }

  async function changeEmail(e) {
    e.preventDefault()
    const next = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return setMsg({ ok: false, text: 'That doesn’t look like an email address.' })
    if (next.toLowerCase() === String(currentEmail || '').toLowerCase()) return setMsg({ ok: false, text: 'That’s already your email.' })
    setBusy(true)
    setMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ email: next })
      if (error) throw error
      setMsg({ ok: true, text: `Check ${next} for a link to confirm the change.` })
      setOpen(null)
    } catch (err) {
      setMsg({ ok: false, text: err?.message || 'Couldn’t change your email. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    if (password.length < 6) return setMsg({ ok: false, text: 'Use at least 6 characters.' })
    setBusy(true)
    setMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMsg({ ok: true, text: 'Password updated.' })
      setOpen(null)
    } catch (err) {
      setMsg({ ok: false, text: err?.message || 'Couldn’t change your password. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-section">
      <p className="account-section-head">Email &amp; password</p>
      <div className="account-cred-actions">
        <button type="button" className="btn-text" onClick={() => start('email')}>Change email</button>
        <span aria-hidden="true" className="account-data-sep"> · </span>
        <button type="button" className="btn-text" onClick={() => start('password')}>Change password</button>
      </div>

      {open === 'email' && (
        <form className="account-cred-form" onSubmit={changeEmail}>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="New email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="New email address"
          />
          <button type="submit" className="btn btn-ghost btn-block" disabled={busy}>
            {busy ? 'Saving…' : 'Send confirmation'}
          </button>
        </form>
      )}

      {open === 'password' && (
        <form className="account-cred-form" onSubmit={changePassword}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="New password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="New password"
          />
          <button type="submit" className="btn btn-ghost btn-block" disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}

      {msg && <p className={`account-note ${msg.ok ? '' : 'account-note-err'}`}>{msg.text}</p>}
    </div>
  )
}

// Dietary preferences: diets + allergies, saved straight to the synced prefs.
// The AI reads these on every meal/chat/dish request.
function DietSection() {
  const [diet, setDiet] = useState(() => staplePrefs.getDiet())
  const update = (next) => {
    setDiet(next)
    staplePrefs.setDiet(next)
  }
  const toggle = (group, key) =>
    update({ ...diet, [group]: { ...(diet[group] || {}), [key]: !diet[group]?.[key] } })

  // Has the user marked anything as an allergy / must-avoid? If so we require an
  // explicit acknowledgement that the AI can get it wrong before they lean on
  // the diet filter — allergies are a safety matter, not just a preference.
  const hasAvoid = AVOID_OPTIONS.some((o) => diet.avoid?.[o.key]) || !!String(diet.note || '').trim()
  const acknowledged = !!diet.allergyAck

  return (
    <div className="account-section">
      <p className="account-section-head">Dietary preferences</p>
      <p className="account-section-sub">Meal ideas and chat answers will follow these.</p>

      <p className="diet-group-label">Diet</p>
      <div className="chips">
        {DIET_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            className="chip"
            aria-pressed={!!diet.diets?.[o.key]}
            onClick={() => toggle('diets', o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="diet-group-label">Avoid / allergies</p>
      <div className="chips">
        {AVOID_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            className="chip"
            aria-pressed={!!diet.avoid?.[o.key]}
            onClick={() => toggle('avoid', o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <input
        className="input diet-note-input"
        placeholder="Anything else to avoid (e.g. mushrooms)"
        value={diet.note || ''}
        onChange={(e) => update({ ...diet, note: e.target.value })}
        maxLength={200}
        aria-label="Anything else to avoid"
      />
      {hasAvoid && !acknowledged ? (
        <div className="diet-ack">
          <p>
            <strong>Important:</strong> we pass your allergies to the AI, but it can make mistakes and must
            not be relied on to keep an allergen out. Always read the label on every product yourself before
            eating. Please confirm you understand.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => update({ ...diet, allergyAck: true })}
          >
            I understand
          </button>
        </div>
      ) : (
        <p className="diet-safety">
          We pass these to the AI for every suggestion, but it can make mistakes — always check labels
          yourself, especially for allergies.
        </p>
      )}
    </div>
  )
}

function UsageBar({ label, used, limit, loading }) {
  const pct = loading ? 38 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
  const full = !loading && used >= limit
  return (
    <div className="usage-row">
      <div className="usage-top">
        <span>{label}</span>
        <span className={`usage-count ${full ? 'full' : ''}`}>{loading ? '· · ·' : `${used} / ${limit}`}</span>
      </div>
      <div className="usage-track">
        <div className={`usage-fill ${full ? 'full' : ''} ${loading ? 'is-loading' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
