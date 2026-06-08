import { useState } from 'react'
import { motion } from 'framer-motion'
import { categoryLabel, locationLabel } from '../lib/categories.js'
import { expiryState, expiryLabel, effectiveExpiry, isEstimated, isLongLife, daysOld, daysUntil } from '../lib/expiry.js'
import { IconCheck, IconCircle, IconClock, IconWarning, IconPlus } from '../icons.jsx'

export default function ItemRow({ item, onEdit, onUse, onToss, onReadd }) {
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
  // On the "Used & gone" screen, the action re-adds the item to the shopping
  // list and clears it from the archive. Tapping flips the plus to a green tick
  // for a beat, then the row removes itself.
  const [readded, setReadded] = useState(false)
  function readd() {
    if (readded) return
    setReadded(true)
    setTimeout(() => onReadd?.(item), 300)
  }

  // By default an item just STATES ITS AGE ("Added today", "3 days old") —
  // never "use by", only how long you've had it. The colour still flags how far
  // through its fresh window it is: amber within ~3 days of the end, red in the
  // last day or past it (so a 7-day item is calm to day 3, amber on days 4–5,
  // red from day 6, while longer-life things like sauces/frozen stay calm much
  // longer). ONLY when the user has entered an accurate use-by date do we show
  // the factual "Use by / Expired" instead.
  const remaining = daysUntil(eff)
  // Long-life staples (tins, dried, condiments…) just read "In stock" — no age,
  // no warning colour — unless the user set a real use-by themselves.
  const stocked = isLongLife(item) && !eff
  let displayState = 'none'
  let expiryText = ''
  if (stocked) {
    expiryText = 'In stock'
  } else if (estimated) {
    const age = daysOld(item)
    displayState = remaining === null ? 'none' : remaining <= 1 ? 'expired' : remaining <= 3 ? 'soon' : 'ok'
    expiryText = age <= 0 ? 'Added today' : age === 1 ? '1 day old' : `${age} days old`
  } else if (eff) {
    displayState = state
    expiryText = state === 'expired' ? `Expired ${expiryLabel(eff)}` : `Use by ${expiryLabel(eff)}`
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
        <span className="item-name-row">
          <span className="item-name">
            {item.name}
            {item.quantity > 1 || (item.unit && item.unit !== '1') ? (
              <span className="qty">  ·  {formatQty(item)}</span>
            ) : null}
          </span>
          {isNew && <span className="tag-new">New</span>}
        </span>
        <span className="item-meta">
          <span className={`tag cat-${item.category}`}>{categoryLabel(item.category)}</span>
          <span className="dot" />
          <span>{locationLabel(item.location)}</span>
          {expiryText && (
            <>
              <span className="dot" />
              <span className={`expiry-chip ${displayState}`}>
                {!stocked && <IconClock size={13} />}
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
          <button
            className={`icon-btn readd ${readded ? 'on' : ''}`}
            onClick={readd}
            aria-label={`Add ${item.name} to your shopping list`}
            title="Add back to your shopping list"
          >
            {readded ? <IconCheck size={19} /> : <IconPlus size={19} />}
          </button>
        ) : (
          <button
            className={`item-done ${checking ? 'on' : ''}`}
            onClick={markUsed}
            aria-pressed={checking}
            aria-label={`Mark ${item.name} as used`}
            title="Tap when you've used or finished this"
          >
            {checking ? <IconCheck size={17} /> : <IconCircle size={17} />}
            <span>Used</span>
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
