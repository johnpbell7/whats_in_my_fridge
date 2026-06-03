import { motion } from 'framer-motion'
import { categoryLabel, locationLabel } from '../lib/categories.js'
import { expiryState, expiryLabel } from '../lib/expiry.js'
import { IconCheck, IconTrash, IconClock, IconWarning } from '../icons.jsx'

export default function ItemRow({ item, onEdit, onUse, onToss, onRestore }) {
  const state = expiryState(item)
  const archived = item.status !== 'active'
  const lowConfidence = item.source !== 'manual' && typeof item.confidence === 'number' && item.confidence < 0.6

  const rowClass = [
    'item',
    archived ? 'done' : '',
    !archived && state === 'soon' ? 'soon' : '',
    !archived && state === 'expired' ? 'expired' : ''
  ].filter(Boolean).join(' ')

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
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
          {item.expiry_date && (
            <>
              <span className="dot" />
              <span className={`expiry-chip ${state}`}>
                <IconClock size={13} />
                {state === 'expired' ? 'Expired ' : 'Use by '}
                {expiryLabel(item.expiry_date)}
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
          <>
            <button className="icon-btn use" onClick={() => onUse(item)} aria-label={`Mark ${item.name} used`}>
              <IconCheck size={20} />
            </button>
            <button className="icon-btn toss" onClick={() => onToss(item)} aria-label={`Mark ${item.name} finished or thrown out`}>
              <IconTrash size={18} />
            </button>
          </>
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
