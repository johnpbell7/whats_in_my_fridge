import { motion } from 'framer-motion'
import SavedMeals from './SavedMeals.jsx'
import { IconClose } from '../icons.jsx'

// Saved meals in a bottom sheet, reachable from the dashboard and from Tonight —
// so your saved dinners don't live only behind the Plus fridge.
export default function SavedSheet({ onClose, onGoChat }) {
  return (
    <div className="scrim" onClick={onClose}>
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Your saved meals"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2>Your saved meals</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>
        <SavedMeals onGoChat={onGoChat} />
      </motion.div>
    </div>
  )
}
