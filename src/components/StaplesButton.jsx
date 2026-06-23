import { useState, useSyncExternalStore } from 'react'
import { AnimatePresence } from 'framer-motion'
import { staplePrefs } from '../lib/staples.js'
import StaplesSheet from './StaplesSheet.jsx'
import { IconSparkle, IconCheck, IconChevron } from '../icons.jsx'

// The "set your kitchen staples" affordance for the pre-prompt areas (Ask + the
// Tonight confirm screen). Highlighted until they've set it, then shows a quiet
// "staples set" state they can tap to edit. Reactive to the prefs store.
export default function StaplesButton() {
  const hasSet = useSyncExternalStore(
    staplePrefs.subscribe,
    () => staplePrefs.hasSetPantry(),
    () => staplePrefs.hasSetPantry()
  )
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={`staples-cta ${hasSet ? 'set' : ''}`} onClick={() => setOpen(true)}>
        {hasSet ? <IconCheck size={15} /> : <IconSparkle size={15} />}
        <span>
          {hasSet
            ? 'Kitchen staples set — tap to edit'
            : 'Tell me your kitchen staples (spices, oils) for better ideas'}
        </span>
        <IconChevron size={15} />
      </button>
      <AnimatePresence>{open && <StaplesSheet onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}
