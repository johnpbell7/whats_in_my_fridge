import { motion } from 'framer-motion'
import { useSheet } from '../lib/useSheet.js'
import { IconClose } from '../icons.jsx'

// Shown once to people who sign up on a computer: the app lives on the phone
// (that's where the fridge is), so point them there with a QR code. The code
// opens /qr/pc, so these show up as their own line in the analytics.
export default function PhoneSheet({ onClose }) {
  const ref = useSheet(onClose)
  return (
    <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div
        className="sheet phone-sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2 id="phone-title">Put it on your phone</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>
        <div className="phone-body">
          <img className="phone-qr" src="/phone-qr.svg" alt="QR code that opens What’s in my Fridge on your phone" width="132" height="132" />
          <ol className="phone-steps">
            <li>Point your phone’s camera at the code and tap the link.</li>
            <li>Sign in with the same email. Your fridge is already there.</li>
            <li>Add it to your home screen when it asks, so it’s one tap away by the fridge.</li>
          </ol>
        </div>
        <button className="btn btn-ghost btn-block" onClick={onClose}>Got it</button>
      </motion.div>
    </motion.div>
  )
}
