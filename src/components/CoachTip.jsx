import { motion } from 'framer-motion'
import { IconClose } from '../icons.jsx'

// A single contextual coach tip — a friendly, dismissible nudge styled to match
// the app's banners. `icon` is an emoji string; `cta` is an optional action
// button; the ✕ always calls onDismiss (which advances or ends the coach).
export default function CoachTip({ icon, title, children, cta, onCta, onDismiss }) {
  return (
    <motion.div
      className="coach-tip"
      role="status"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      {icon && (
        <span className="coach-ico" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="coach-body">
        {title && <strong className="coach-title">{title}</strong>}
        <p className="coach-text">{children}</p>
        {cta && (
          <button type="button" className="coach-cta" onClick={onCta}>
            {cta}
          </button>
        )}
      </div>
      {onDismiss && (
        <button type="button" className="coach-x" onClick={onDismiss} aria-label="Dismiss tip">
          <IconClose size={15} />
        </button>
      )}
    </motion.div>
  )
}
