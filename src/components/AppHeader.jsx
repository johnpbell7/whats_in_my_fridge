import { IconInfo, IconUser, IconHome } from '../icons.jsx'

// The standard top bar shown on every feature screen (and the dashboard). On
// feature screens a home icon returns to the dashboard; the ⓘ help hub and
// account live on the right, so guidance and settings are reachable from
// anywhere — not just the fridge. `count` shows an optional context pill.
export default function AppHeader({ onHome, onHelp, helpBadge, onAccount, count }) {
  // The brand doubles as a "home" button on feature screens (where onHome is
  // set); on the dashboard itself it's just the wordmark.
  const Brand = onHome ? 'button' : 'span'
  const brandProps = onHome ? { type: 'button', onClick: onHome, 'aria-label': 'Home' } : {}

  return (
    <header className="std-header">
      <Brand className="std-brand" {...brandProps}>
        <span className="std-brand-sm">What's in my</span>
        <span className="std-brand-lg">
          Fridge
          <svg className="leaf" viewBox="0 0 100 52" aria-hidden="true">
            <path d="M4 33 C 25 6, 70 1, 97 17 C 73 41, 27 47, 4 33 Z" fill="currentColor" /><path d="M16 30 C 40 16, 66 14, 89 20" fill="none" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
        </span>
      </Brand>

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
