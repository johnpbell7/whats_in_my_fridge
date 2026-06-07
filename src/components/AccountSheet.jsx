import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { useSheet } from '../lib/useSheet.js'
import { getMe, deleteAccount, openBillingPortal } from '../lib/api.js'
import { upgrade } from '../lib/upgrade.js'
import { store } from '../lib/store.js'
import { shopping } from '../lib/shopping.js'
import { staplePrefs } from '../lib/staples.js'
import { savedMeals } from '../lib/meals.js'
import { IconClose, IconUser, IconSparkle } from '../icons.jsx'
import { isStandalone, isMobile } from '../lib/install.js'

// Bottom-sheet account panel: who you are, your plan, this month's usage
// against your limits, and sign out.
export default function AccountSheet({ onClose, onInstall }) {
  const [me, setMe] = useState(null)
  const [err, setErr] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const loading = !me && !err
  const sheetRef = useSheet(onClose)

  async function manageSubscription() {
    if (portalBusy) return
    setPortalBusy(true)
    try {
      const { url } = await openBillingPortal()
      if (url) window.location.href = url
    } catch {
      /* leave the button as-is; nothing destructive happened */
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

        {onInstall && isMobile() && !isStandalone() && (
          <button className="btn btn-ghost btn-block" onClick={onInstall}>
            Add to home screen
          </button>
        )}

        <button className="btn btn-ghost btn-block" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>

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
          <a href="mailto:support@whatsinmyfridge.co.uk">Contact</a>
        </p>
      </motion.div>
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
