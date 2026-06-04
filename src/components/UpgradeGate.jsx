import { useSyncExternalStore } from 'react'
import { AnimatePresence } from 'framer-motion'
import { upgrade } from '../lib/upgrade.js'
import UpgradeSheet from './UpgradeSheet.jsx'

// Renders the Plus paywall whenever something calls upgrade.show(reason).
export default function UpgradeGate() {
  const state = useSyncExternalStore(upgrade.subscribe, upgrade.get, upgrade.get)
  return (
    <AnimatePresence>
      {state && <UpgradeSheet reason={state.reason} onClose={() => upgrade.close()} />}
    </AnimatePresence>
  )
}
