import { useState, useEffect } from 'react'
import AppHeader from './AppHeader.jsx'
import { upgrade } from '../lib/upgrade.js'
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

export default function Dashboard({ onOpen, lockedKeys = [], onHelp, helpBadge, onAccount, onReplay, plus, trial, trialDaysLeft }) {
  const locked = new Set(lockedKeys)
  // Briefly pulse the Tonight card on load to point people at the free hero.
  const [nudgeTonight, setNudgeTonight] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setNudgeTonight(false), 3200)
    return () => clearTimeout(t)
  }, [])
  // Three banner states: on trial (countdown), paying (thanks), or free (upsell).
  const onTrial = trial && typeof trialDaysLeft === 'number'
  const paid = plus && !onTrial
  return (
    <div className="dashboard">
      <AppHeader onHelp={onHelp} helpBadge={helpBadge} onAccount={onAccount} />

      <div className="dash-body">
      {/* Slim banner slot — a promo image can be dropped in via .dash-banner. */}
      {paid ? (
        <div className="dash-banner" role="note">
          <IconSparkle size={20} />
          <div className="dash-banner-text">
            <strong>You’re on Plus 💚</strong>
            <span>Your whole kitchen, unlocked — thanks for the support.</span>
          </div>
        </div>
      ) : onTrial ? (
        <div className="dash-banner" role="note">
          <IconSparkle size={20} />
          <div className="dash-banner-text">
            <strong>Your free Plus trial</strong>
            <span><strong>{trialDaysLeft}</strong> {trialDaysLeft === 1 ? 'day' : 'days'} left — the whole app, unlocked</span>
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
          </div>
        </div>
      ) : (
        <button className="dash-banner dash-banner-cta" onClick={() => upgrade.show('fridge')}>
          <IconSparkle size={20} />
          <div className="dash-banner-text">
            <strong>Unlock your whole kitchen</strong>
            <span>Track your fridge, scan your shopping & build a smart list with Plus</span>
          </div>
        </button>
      )}

      <div className="dash-grid">
        {FEATURES.map(({ key, label, sub, Icon }) => {
          const isLocked = locked.has(key)
          return (
            <button
              key={key}
              type="button"
              className={`dash-card ${isLocked ? 'dash-locked' : ''} ${key === 'dinner' && nudgeTonight ? 'dash-pulse' : ''}`}
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

      {onReplay && (
        <button type="button" className="dash-replay" onClick={onReplay}>
          <IconSparkle size={14} /> Replay the walkthrough
        </button>
      )}
      </div>
    </div>
  )
}
