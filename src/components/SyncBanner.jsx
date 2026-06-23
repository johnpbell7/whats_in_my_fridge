import { useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { syncStatus } from '../lib/syncState.js'
import { IconWarning } from '../icons.jsx'

// A slim banner that appears only when cloud sync isn't healthy, so a user on a
// flaky connection knows their changes are saved locally but not yet synced —
// rather than silently assuming everything reached the cloud. Hidden entirely
// when sync is fine (the normal case).
export default function SyncBanner() {
  const status = useSyncExternalStore(syncStatus.subscribe, syncStatus.get, syncStatus.get)
  const offline = status === 'offline'
  const error = status === 'error'

  return (
    <AnimatePresence>
      {(offline || error) && (
        <motion.div
          className="sync-banner"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <IconWarning size={14} />
          <span>
            {offline
              ? 'You’re offline — changes are saved on this device and will sync when you’re back.'
              : 'Couldn’t sync to the cloud. Your changes are safe on this device.'}
          </span>
          {error && (
            <button type="button" className="sync-banner-retry" onClick={() => syncStatus.retry()}>
              Retry
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
