import { useEffect, useRef, useState } from 'react'
import { IconFridge, IconCamera, IconChat, IconCart, IconSparkle } from '../icons.jsx'

const TABS = [
  { key: 'dinner', label: 'Tonight', Icon: IconSparkle },
  { key: 'chat', label: 'Ask', Icon: IconChat },
  { key: 'scan', label: 'Scan', Icon: IconCamera },
  { key: 'inventory', label: 'Fridge', Icon: IconFridge },
  { key: 'shopping', label: 'List', Icon: IconCart }
]

export default function Nav({ tab, onChange, pulseTab, pulseAt }) {
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
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-current={tab === key ? 'page' : undefined}
        >
          <span className={`nav-icon ${pulsing && key === pulseTab ? 'pulse' : ''}`}>
            <Icon size={23} />
          </span>
          {label}
        </button>
      ))}
    </nav>
  )
}
