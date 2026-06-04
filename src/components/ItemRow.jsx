import { useState } from 'react'
import { motion } from 'framer-motion'
import { categoryLabel, locationLabel } from '../lib/categories.js'
import { expiryState, expiryLabel, effectiveExpiry, isEstimated, daysOld, daysUntil } from '../lib/expiry.js'
import { IconCheck, IconCircle, IconClock, IconWarning } from '../icons.jsx'

export default function ItemRow({ item, onEdit, onUse, onToss, onRestore }) {
  const state = expiryState(item)
  const eff = effectiveExpiry(item)
  const estimated = isEstimated(item)
  const archived = item.status !== 'active'
  const lowConfidence = item.source !== 'manual' && typeof item.confidence === 'number' && item.confidence < 0.6
  // Small "New" badge for the first 24 hours after an item is added.
  const isNew =
    !archived && item.added_date && Date.now() - Date.parse(item.added_date) < 86400000
  // The "Used" control starts unticked (neutral); tapping it ticks green, then
  // the row removes itself a beat later for a satisfying confirm.
  const [checking, setChecking] = useState(false)
  function markUsed() {
    if (checking) return
    setChecking(true)
    setTimeout(() => onUse(item), 300)
  }

  // Estimated items show their AGE ("Added today", "3 days old") and flag by
  // how far through their fresh window they are: amber within ~3 days of the
  // end, red once past it (so a 7-day item flags on day 4, red on day 7, while
  // longer-life things like sauces/frozen stay calm much longer). Items with an
  // exact date keep the factual "Use by / Expired".
  const remaining = daysUntil(eff)
  let displayState = 'none'
  let expiryText = ''
  if (eff) {
    if (estimated) {
      const age = daysOld(item)
      displayState = remaining <= 0 ? 'expired' : remaining <= 3 ? 'soon' : 'ok'
      expiryText = age <= 0 ? 'Added today' : age === 1 ? '1 day old' : `${age} days old`
    } else {
      displayState = state
      expiryText = state === 'expired' ? `Expired ${expiryLabel(eff)}` : `Use by ${expiryLabel(eff)}`
    }
  }

  const rowClass = [
    'item',
    archived ? 'done' : '',
    !archived && displayState === 'soon' ? 'soon' : '',
    !archived && displayState === 'expired' ? 'expired' : ''
  ].filter(Boolean).join(' ')

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.11 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={rowClass}
    >
      <button className="item-main" onClick={() => onEdit(item)}>
        <span className="item-name">
          {item.name}
          {item.quantity > 1 || (item.unit && item.unit !== '1') ? (
            <span className="qty">  ·  {formatQty(item)}</span>
          ) : null}
          {isNew && <span className="tag-new">New</span>}
        </span>
        <span className="item-meta">
          <span className={`tag cat-${item.category}`}>{categoryLabel(item.category)}</span>
          <span className="dot" />
          <span>{locationLabel(item.location)}</span>
          {eff && (
            <>
              <span className="dot" />
              <span className={`expiry-chip ${displayState}`}>
                <IconClock size={13} />
                {expiryText}
              </span>
            </>
          )}
          {lowConfidence && (
            <>
              <span className="dot" />
              <span className="confidence-flag">
                <IconWarning size={13} /> check
              </span>
            </>
          )}
        </span>
      </button>

      <div className="item-actions">
        {archived ? (
          <button className="icon-btn use" onClick={() => onRestore(item)} aria-label={`Put ${item.name} back`}>
            <IconClock size={19} />
          </button>
        ) : (
          <button
            className={`item-done ${checking ? 'on' : ''}`}
            onClick={markUsed}
            aria-pressed={checking}
            aria-label={`Mark ${item.name} as used`}
            title="Tap when you've used or finished this"
          >
            {checking ? <IconCheck size={17} /> : <IconCircle size={17} />} Used
          </button>
        )}
      </div>
    </motion.li>
  )
}

function formatQty(item) {
  const q = item.quantity ?? 1
  const u = (item.unit || '').trim()
  if (u) return `${q} ${u}`
  return String(q)
}
