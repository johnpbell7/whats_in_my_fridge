import { useState } from 'react'
import { motion } from 'framer-motion'
import { staplePrefs, PANTRY_STAPLES, PANTRY_DEFAULTS } from '../lib/staples.js'
import { useSheet } from '../lib/useSheet.js'
import { IconClose, IconCheck, IconSparkle } from '../icons.jsx'

// One-time "what do you usually keep?" checklist, surfaced after the first scan.
// A photo won't capture the spice rack or the condiments in the door, so the AI
// can wrongly tell people to buy salt or oil. Confirming staples once fixes that
// across every meal idea, dish check and walkthrough. Pre-ticked with the common
// ones; the user unticks anything they don't keep.
export default function StaplesSheet({ onClose, onSaved }) {
  const sheetRef = useSheet(onClose)
  const existing = staplePrefs.getPantry()
  const [picked, setPicked] = useState(() => {
    // Seed from a previous choice, or the sensible defaults the first time.
    const base = existing || Object.fromEntries(PANTRY_DEFAULTS.map((s) => [s, true]))
    const map = {}
    for (const s of PANTRY_STAPLES) map[s] = Boolean(base[s])
    return map
  })

  const toggle = (s) => setPicked((p) => ({ ...p, [s]: !p[s] }))
  const count = Object.values(picked).filter(Boolean).length

  function save() {
    staplePrefs.setPantry(picked)
    onSaved?.()
    onClose?.()
  }

  return (
    <div className="scrim" onClick={onClose}>
      <motion.div
        className="sheet staples-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Your kitchen staples"
        tabIndex={-1}
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2>What do you usually keep?</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        <p className="staples-intro">
          <IconSparkle size={14} className="inline-ico" /> Tick the staples you keep in the cupboard — spices, oils,
          condiments a photo won’t show. I’ll assume you have them, so I never tell you to buy salt you already own.
        </p>

        <div className="staples-grid">
          {PANTRY_STAPLES.map((s) => {
            const on = picked[s]
            return (
              <button key={s} type="button" className={`exp-chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(s)}>
                {on && <IconCheck size={12} />} {s}
              </button>
            )
          })}
        </div>

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary btn-block" onClick={save}>
            Save my staples ({count})
          </button>
        </div>
      </motion.div>
    </div>
  )
}
