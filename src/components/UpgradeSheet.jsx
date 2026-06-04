import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconClose, IconCheck, IconSparkle } from '../icons.jsx'

const BENEFITS = [
  'Photo & receipt scans — 300 a month (Free gives 5)',
  'Chat questions — 1,000 a month (Free gives 15)',
  'Sharper AI recognition for trickier photos',
  'Everything else stays, with no limits to think about'
]

// Plus upgrade offer. The Subscribe button is a placeholder until card
// payments (RevenueCat) are wired up.
export default function UpgradeSheet({ onClose }) {
  const [pending, setPending] = useState(false)

  return (
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
          <h2>Upgrade to Plus</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        <div className="upgrade-badge">
          <IconSparkle size={22} />
        </div>
        <p className="upgrade-tagline">Unlock the full app and keep scanning, chatting and tracking with room to spare.</p>

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
          <button className="btn btn-primary btn-block" onClick={() => setPending(true)}>
            Subscribe — £3.99/month
          </button>
        )}
        <button className="btn-text upgrade-later" onClick={onClose}>
          Maybe later
        </button>
      </motion.div>
    </div>
  )
}
