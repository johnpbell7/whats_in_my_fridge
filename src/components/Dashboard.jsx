import AppHeader from './AppHeader.jsx'
import { IconSparkle, IconChat, IconCamera, IconFridge, IconCart, IconBookmark } from '../icons.jsx'

// Home dashboard — the app's front door. A slim banner slot (for a promo image)
// plus a grid of every feature as a button. Plus features are greyed with a Plus
// dot for free users, mirroring the footer nav. No footer nav shows here.
const FEATURES = [
  { key: 'dinner', label: 'Tonight', sub: 'Dinner from a photo', Icon: IconSparkle },
  { key: 'chat', label: 'Ask', sub: 'What can I make?', Icon: IconChat },
  { key: 'saved', label: 'Saved meals', sub: 'Your favourites', Icon: IconBookmark },
  { key: 'scan', label: 'Scan', sub: 'Shopping into your fridge', Icon: IconCamera },
  { key: 'inventory', label: 'Fridge', sub: 'Track what you have', Icon: IconFridge },
  { key: 'shopping', label: 'List', sub: 'Smart shopping list', Icon: IconCart }
]

export default function Dashboard({ onOpen, lockedKeys = [], onHelp, helpBadge, onAccount, plus, trialDaysLeft }) {
  const locked = new Set(lockedKeys)
  const onTrial = plus && typeof trialDaysLeft === 'number'
  return (
    <div className="screen dashboard">
      <AppHeader onHelp={onHelp} helpBadge={helpBadge} onAccount={onAccount} />

      {/* Slim banner slot — a promo image can be dropped in via .dash-banner. */}
      <div className="dash-banner" role="note">
        <IconSparkle size={20} />
        <div className="dash-banner-text">
          <strong>The whole app, free for 14 days</strong>
          <span>
            {onTrial
              ? `${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'} left on your trial`
              : 'Track your fridge, scan your shopping & more'}
          </span>
          {onTrial && (
            <div
              className="dash-trial-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={14}
              aria-valuenow={trialDaysLeft}
              aria-label="Days left on your free trial"
            >
              <span style={{ width: `${Math.max(5, Math.min(100, (trialDaysLeft / 14) * 100))}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="dash-grid">
        {FEATURES.map(({ key, label, sub, Icon }) => {
          const isLocked = locked.has(key)
          return (
            <button
              key={key}
              type="button"
              className={`dash-card ${isLocked ? 'locked' : ''}`}
              onClick={() => onOpen(key)}
            >
              <span className="dash-ico">
                <Icon size={24} />
                {isLocked && (
                  <span className="dash-plus" aria-hidden="true">
                    <IconSparkle size={9} />
                  </span>
                )}
              </span>
              <span className="dash-label">{label}</span>
              <span className="dash-sub">{isLocked ? 'Plus feature' : sub}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
