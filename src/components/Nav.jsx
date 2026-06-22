import { useEffect, useRef, useState } from 'react'
import { IconFridge, IconCamera, IconChat, IconCart, IconSparkle } from '../icons.jsx'

const TABS = [
  { key: 'dinner', label: 'Tonight', Icon: IconSparkle },
  { key: 'chat', label: 'Ask', Icon: IconChat },
  { key: 'scan', label: 'Scan', Icon: IconCamera },
  { key: 'inventory', label: 'Fridge', Icon: IconFridge },
  { key: 'shopping', label: 'List', Icon: IconCart }
]

// `lockedKeys` are Plus tabs a free user can still tap (they reach the upsell /
// read-only screen) — shown greyed with a small Plus dot so it's clear they're
// a paid feature without removing them from the journey.
export default function Nav({ tab, onChange, pulseTab, pulseAt, lockedKeys = [] }) {
  const locked = new Set(lockedKeys)
  // Briefly pulse a tab's icon when pulseAt changes (e.g. a new shopping-list
  // item lands while you're on another screen, so you know where to look).
  const [pulsing, setPulsing] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setPulsing(true)
    const t = setTimeout(() => setPulsing(false), 1300)
    return () => clearTimeout(t)
  }, [pulseAt])

  return (
    <nav className="nav" aria-label="Primary">
      {TABS.map(({ key, label, Icon }) => {
        const isLocked = locked.has(key)
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-current={tab === key ? 'page' : undefined}
            className={isLocked ? 'nav-locked' : undefined}
          >
            <span className={`nav-icon ${pulsing && key === pulseTab ? 'pulse' : ''}`}>
              <Icon size={23} />
              {isLocked && (
                <span className="nav-plus" aria-hidden="true">
                  <IconSparkle size={9} />
                </span>
              )}
            </span>
            {label}
          </button>
        )
      })}
    </nav>
  )
}
