import { useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '../lib/toast.js'
import { IconCheck } from '../icons.jsx'

// Renders the current global toast (if any). Mounted once near the app root.
export default function Toast() {
  const current = useSyncExternalStore(toast.subscribe, toast.get, toast.get)
  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          className="toast"
          role="status"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        >
          <IconCheck size={16} />
          {current.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
