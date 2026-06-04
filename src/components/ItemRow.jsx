import { useState } from 'react'
import { motion } from 'framer-motion'
import { categoryLabel, locationLabel } from '../lib/categories.js'
import { expiryState, expiryLabel, effectiveExpiry, isEstimated } from '../lib/expiry.js'
import { IconCheck, IconCircle, IconClock, IconWarning } from '../icons.jsx'

export default function ItemRow({ item, onEdit, onUse, onToss, onRestore }) {
  const state = expiryState(item)
  const eff = effectiveExpiry(item)
  const estimated = isEstimated(item)
  const archived = item.status !== 'active'
  const lowConfidence = item.source !== 'manual' && typeof item.confidence === 'number' && item.confidence < 0.6
  // The "Used" control starts unticked (neutral); tapping it ticks green, then
  // the row removes itself a beat later for a satisfying confirm.
  const [checking, setChecking] = useState(false)
  function markUsed() {
    if (checking) return
    setChecking(true)
    setTimeout(() => onUse(item), 300)
  }

  // "Expired" is only ever said when you entered an exact date (it's factual).
  // For an estimated countdown we soften it: amber, and worded as a nudge.
  const past = state === 'expired'
  const displayState = estimated && past ? 'soon' : state
  const expiryText = past
    ? estimated
      ? 'Use or bin soon'
      : `Expired ${expiryLabel(eff)}`
    : `${estimated ? 'Best by ' : 'Use by '}${expiryLabel(eff)}`

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
