import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { getMe } from '../lib/api.js'
import UpgradeSheet from './UpgradeSheet.jsx'
import { IconClose, IconUser, IconSparkle } from '../icons.jsx'

// Bottom-sheet account panel: who you are, your plan, this month's usage
// against your limits, and sign out.
export default function AccountSheet({ onClose }) {
  const [me, setMe] = useState(null)
  const [err, setErr] = useState(false)
  const [upgrade, setUpgrade] = useState(false)

  useEffect(() => {
    getMe().then(setMe).catch(() => setErr(true))
  }, [])

  const isPlus = me?.tier === 'plus'

  return (
    <>
    <div className="scrim" onClick={onClose}>
      <motion.div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2>Account</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        <div className="account-id">
          <span className="account-avatar"><IconUser size={22} /></span>
          <div>
            <div className="account-email">{me?.email || '…'}</div>
            <div className="account-tier">{me?.tierLabel || me?.tier || 'Free'} plan</div>
          </div>
        </div>

        {err && <p className="auth-error">Couldn’t load your usage just now.</p>}

        {me?.usage && (
          <div className="account-usage">
            <UsageBar label="Photo scans" used={me.usage.scans.used} limit={me.usage.scans.limit} />
            <UsageBar label="Chat questions" used={me.usage.chats.used} limit={me.usage.chats.limit} />
            <p className="account-note">Resets at the start of each month.</p>
          </div>
        )}

        {me && !isPlus && (
          <button className="btn btn-primary btn-block upgrade-cta" onClick={() => setUpgrade(true)}>
            <IconSparkle size={18} /> Upgrade to Plus — £3.99/month
          </button>
        )}

        <button className="btn btn-ghost btn-block" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </motion.div>
    </div>

    <AnimatePresence>
      {upgrade && <UpgradeSheet onClose={() => setUpgrade(false)} />}
    </AnimatePresence>
    </>
  )
}

function UsageBar({ label, used, limit }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
  const full = used >= limit
  return (
    <div className="usage-row">
      <div className="usage-top">
        <span>{label}</span>
        <span className={`usage-count ${full ? 'full' : ''}`}>
          {used} / {limit}
        </span>
      </div>
      <div className="usage-track">
        <div className={`usage-fill ${full ? 'full' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
