import { upgrade } from '../lib/upgrade.js'
import { IconSparkle, IconCart, IconFridge } from '../icons.jsx'

// Shown in place of a Plus-only screen (the shopping list, fridge tracking) when
// a free user opens it. The dinner magic stays free; persistence is the upsell.
const COPY = {
  fridge: {
    Icon: IconFridge,
    title: 'Track your fridge with Plus',
    body: 'Keep a running list of what you’ve got so you never double-buy, see what’s about to go off, and build dinners around it. Snapping your shopping in is part of Plus.',
    reason: 'fridge'
  },
  list: {
    Icon: IconCart,
    title: 'Your shopping list is a Plus feature',
    body: 'Save what you need, tick it off as you shop, and have it file straight back into your fridge. Upgrade to keep a list that remembers.',
    reason: 'list'
  }
}

export default function LockedFeature({ kind = 'fridge', headerTitle }) {
  const c = COPY[kind] || COPY.fridge
  return (
    <div className="screen">
      <header className="app-header">
        <div>
          <h1 className="app-title">{headerTitle || c.title}</h1>
          <p className="app-subtitle">Plus feature</p>
        </div>
      </header>
      <div className="empty" style={{ paddingTop: 40 }}>
        <div className="empty-art">
          <c.Icon size={32} />
        </div>
        <h3>{c.title}</h3>
        <p>{c.body}</p>
        <div className="empty-actions">
          <button className="btn btn-primary" onClick={() => upgrade.show(c.reason)}>
            <IconSparkle size={18} /> Unlock with Plus
          </button>
        </div>
      </div>
    </div>
  )
}
