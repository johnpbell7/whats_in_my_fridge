import { upgrade } from '../lib/upgrade.js'
import { FreshVisual, ShopVisual } from './Onboarding.jsx'
import { IconSparkle, IconCheck } from '../icons.jsx'

// Shown in place of a Plus-only screen (My food, Scan, My list) for free users.
// It's a mini sales pitch, not a wall: a live preview of the feature + the
// reasons to want it + one tap to upgrade. The dinner magic stays free.
const COPY = {
  fridge: {
    Visual: FreshVisual,
    title: 'Your whole fridge, in your pocket',
    body: 'Track what you’ve got so nothing gets wasted — and build dinners around it.',
    benefits: [
      'Know exactly what’s in, always',
      'See what’s about to go off, first',
      'Stop double-buying at the shop'
    ],
    reason: 'fridge'
  },
  list: {
    Visual: ShopVisual,
    title: 'A shopping list that remembers',
    body: 'Save what you need, tick it off at the shops, and watch it refill your fridge.',
    benefits: [
      'Jot things down as you run low',
      'Tick them off as you buy',
      'Filed straight back into your fridge'
    ],
    reason: 'list'
  }
}

export default function LockedFeature({ kind = 'fridge', headerTitle }) {
  const c = COPY[kind] || COPY.fridge
  const { Visual } = c
  return (
    <div className="screen">
      <header className="app-header">
        <div>
          <h1 className="app-title">{headerTitle || 'Plus'}</h1>
          <p className="app-subtitle">A taste of what Plus unlocks</p>
        </div>
      </header>

      <div className="locked">
        <span className="locked-pill">
          <IconSparkle size={14} /> Plus feature
        </span>
        <div className="locked-preview">
          <Visual />
        </div>
        <h3>{c.title}</h3>
        <p>{c.body}</p>
        <ul className="upgrade-benefits locked-benefits">
          {c.benefits.map((b) => (
            <li key={b}>
              <span className="upgrade-tick">
                <IconCheck size={13} />
              </span>
              {b}
            </li>
          ))}
        </ul>
        <button className="btn btn-primary btn-block locked-cta" onClick={() => upgrade.show(c.reason)}>
          <IconSparkle size={18} /> Unlock with Plus
        </button>
      </div>
    </div>
  )
}
