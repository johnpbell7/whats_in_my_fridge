import { IconInfo, IconUser, IconHome } from '../icons.jsx'

// The standard top bar shown on every feature screen (and the dashboard). On
// feature screens a home icon returns to the dashboard; the ⓘ help hub and
// account live on the right, so guidance and settings are reachable from
// anywhere — not just the fridge. `count` shows an optional context pill.
export default function AppHeader({ onHome, onHelp, helpBadge, onAccount, count }) {
  return (
    <header className="std-header">
      <span className="std-brand">
        <span className="std-brand-sm">What's in my</span>
        <span className="std-brand-lg">
          Fridge
          <svg className="leaf" viewBox="0 0 100 52" aria-hidden="true">
            <path d="M2 26 C 18 2, 64 2, 94 22 C 64 50, 18 50, 2 26 Z" fill="currentColor" />
          </svg>
        </span>
      </span>

      <div className="header-right">
        {count != null && (
          <span className="count-pill">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
        )}
        {onHome && (
          <button type="button" className="account-btn" onClick={onHome} aria-label="Home">
            <IconHome size={18} />
          </button>
        )}
        {onHelp && (
          <button
            className="account-btn"
            onClick={onHelp}
            aria-label={helpBadge ? "How it works & what's new (new update)" : "How it works & what's new"}
          >
            <IconInfo size={18} />
            {helpBadge && <span className="badge-dot" aria-hidden="true" />}
          </button>
        )}
        {onAccount && (
          <button className="account-btn" onClick={onAccount} aria-label="Your account">
            <IconUser size={18} />
          </button>
        )}
      </div>
    </header>
  )
}
