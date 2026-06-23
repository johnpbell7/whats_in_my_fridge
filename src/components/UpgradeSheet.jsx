import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSheet } from '../lib/useSheet.js'
import { startCheckout } from '../lib/api.js'
import { track } from '../lib/analytics.js'
import { IconClose, IconCheck, IconSparkle } from '../icons.jsx'

const BENEFITS = [
  'Your shopping list — save it, tick it off, restock your fridge in a tap',
  'Track your whole fridge — never double-buy or bin food again',
  'Unlimited dinners from a photo + sharper AI recognition',
  'Save your favourite meals and your essentials'
]

const REASON_HEAD = {
  scans: "That's your free dinners for this month — go unlimited with Plus",
  chat: "That's this month's free questions — unlimited with Plus",
  rate: "Whoa, speedy — that's today's limit",
  trial_ending: 'Your trial ends tomorrow — keep your fridge, list & saved meals',
  trial_ended: 'Your fridge, list & saved meals are locked — pick up where you left off',
  list: 'Keep your shopping list with Plus',
  fridge: 'Track your fridge with Plus',
  method: 'Step-by-step recipes — cook any idea with Plus',
  account: ''
}

// Plus upgrade offer. "Subscribe" starts Stripe Checkout (startCheckout); a
// "coming soon" note only shows if payments aren't configured yet
// (err.code === 'not_configured'). `reason` adds a contextual headline.
export default function UpgradeSheet({ onClose, reason = '' }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const contextHead = REASON_HEAD[reason]
  const sheetRef = useSheet(onClose)

  async function subscribe() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const { url } = await startCheckout()
      if (url) {
        track('upgrade_started', { reason: reason || 'direct' }) // funnel: reached Stripe checkout
        window.location.href = url // hand off to Stripe's hosted checkout
        return
      }
      setPending(true)
    } catch (err) {
      // Only show the "launching soon" note when payments genuinely aren't set
      // up yet. A real failure (network, Stripe error) shows a retryable error
      // instead of a misleading "coming soon" message.
      if (err.code === 'not_configured') setPending(true)
      else setError(err.message || 'Could not start checkout. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="scrim" onClick={onClose}>
      <motion.div
        className="sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-sheet-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2 id="upgrade-sheet-title">Upgrade to Plus</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        <div className="upgrade-badge">
          <IconSparkle size={22} />
        </div>
        {contextHead && <p className="upgrade-context">{contextHead}</p>}
        <p className="upgrade-tagline">Unlock the full app — your fridge, your list, unlimited dinners and more.</p>

        <ul className="upgrade-benefits">
          {BENEFITS.map((b) => (
            <li key={b}>
              <span className="upgrade-tick"><IconCheck size={13} /></span>
              {b}
            </li>
          ))}
        </ul>

        <div className="upgrade-price">
          <span className="upgrade-amount">£3.99</span>
          <span className="upgrade-per">/ month</span>
        </div>

        {pending ? (
          <p className="upgrade-soon">
            Card payments are launching very soon — your account will be the first to be able to upgrade. Thanks for the support! 💚
          </p>
        ) : (
          <>
            <button className="btn btn-primary btn-block" onClick={subscribe} disabled={busy}>
              {busy ? 'Starting checkout…' : 'Subscribe — £3.99/month'}
            </button>
            {error && <p className="auth-error" role="alert">{error}</p>}
          </>
        )}
        <button className="btn-text upgrade-later" onClick={onClose}>
          Maybe later
        </button>
      </motion.div>
    </div>
  )
}
