import { IconFridge, IconCamera, IconChat } from '../icons.jsx'

const TABS = [
  { key: 'inventory', label: 'Inventory', Icon: IconFridge },
  { key: 'scan', label: 'Scan', Icon: IconCamera },
  { key: 'chat', label: 'Chat', Icon: IconChat }
]

export default function Nav({ tab, onChange }) {
  return (
    <nav className="nav" aria-label="Primary">
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-current={tab === key}
        >
          <Icon size={23} />
          {label}
        </button>
      ))}
    </nav>
  )
}
