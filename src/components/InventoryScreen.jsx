import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { store } from '../lib/store.js'
import { sortByExpiry, expiryState } from '../lib/expiry.js'
import ItemRow from './ItemRow.jsx'
import { IconSearch, IconFridge, IconPlus, IconCamera, IconWarning } from '../icons.jsx'

export default function InventoryScreen({ items, onEdit, onAddManual, onGoScan }) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState('active') // 'active' | 'archive'

  const active = items.filter((i) => i.status === 'active')
  const archived = items.filter((i) => i.status !== 'active')

  const soonCount = useMemo(
    () => active.filter((i) => ['soon', 'expired'].includes(expiryState(i))).length,
    [active]
  )

  const visible = useMemo(() => {
    const pool = view === 'active' ? active : archived
    const q = query.trim().toLowerCase()
    const filtered = q ? pool.filter((i) => i.name.toLowerCase().includes(q)) : pool
    return sortByExpiry(filtered)
  }, [view, active, archived, query])

  return (
    <div className="screen">
      <header className="app-header">
        <div>
          <h1 className="app-title">
            Fridge<span className="leaf">.</span>
          </h1>
          <p className="app-subtitle">Whats in my fridge, right now.</p>
        </div>
        <span className="count-pill">
          {active.length} {active.length === 1 ? 'item' : 'items'}
        </span>
      </header>

      {view === 'active' && soonCount > 0 && (
        <div className="banner" role="status">
          <IconWarning size={18} />
          <span>
            {soonCount} {soonCount === 1 ? 'item needs' : 'items need'} using soon — they're at the top of
            the list.
          </span>
        </div>
      )}

      <div className="segment" role="tablist" aria-label="Which items to show">
        <button role="tab" aria-pressed={view === 'active'} onClick={() => setView('active')}>
          In the fridge
        </button>
        <button role="tab" aria-pressed={view === 'archive'} onClick={() => setView('archive')}>
          Used &amp; gone
        </button>
      </div>

      {(view === 'active' ? active.length : archived.length) > 0 && (
        <div className="search">
          <IconSearch size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items"
            aria-label="Search items"
            inputMode="search"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyInventory view={view} hasQuery={Boolean(query.trim())} onAddManual={onAddManual} onGoScan={onGoScan} />
      ) : (
        <ul className="item-list">
          <AnimatePresence initial={false}>
            {visible.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={onEdit}
                onUse={(it) => store.setStatus(it.id, 'used')}
                onToss={(it) => store.setStatus(it.id, 'discarded')}
                onRestore={(it) => store.setStatus(it.id, 'active')}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}

function EmptyInventory({ view, hasQuery, onAddManual, onGoScan }) {
  if (hasQuery) {
    return (
      <div className="empty">
        <div className="empty-art">
          <IconSearch size={30} />
        </div>
        <h3>No matches</h3>
        <p>Nothing here by that name. Try a shorter search.</p>
      </div>
    )
  }
  if (view === 'archive') {
    return (
      <div className="empty">
        <div className="empty-art">
          <IconFridge size={30} />
        </div>
        <h3>Nothing used yet</h3>
        <p>Items you mark as used or thrown out land here, so you can put one back if you change your mind.</p>
      </div>
    )
  }
  return (
    <div className="empty">
      <div className="empty-art">
        <IconFridge size={32} />
      </div>
      <h3>Your fridge is empty</h3>
      <p>Snap a photo to add a few things at once, or add one by hand.</p>
      <div className="empty-actions">
        <button className="btn btn-primary" onClick={onGoScan}>
          <IconCamera size={19} /> Scan a photo
        </button>
        <button className="btn btn-ghost" onClick={onAddManual}>
          <IconPlus size={19} /> Add by hand
        </button>
      </div>
    </div>
  )
}
