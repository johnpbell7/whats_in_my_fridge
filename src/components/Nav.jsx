import { useEffect, useRef, useState } from 'react'
import { IconFridge, IconCamera, IconChat, IconCart } from '../icons.jsx'

const TABS = [
  { key: 'inventory', label: 'My food', Icon: IconFridge },
  { key: 'shopping', label: 'My list', Icon: IconCart },
  { key: 'scan', label: 'Scan', Icon: IconCamera },
  { key: 'chat', label: 'Chat', Icon: IconChat }
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
