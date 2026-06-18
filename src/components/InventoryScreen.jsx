import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { store, seedSample, clearSample } from '../lib/store.js'
import { shopping } from '../lib/shopping.js'
import { LOCATIONS, guessCategory } from '../lib/categories.js'
import { suggestLocation } from '../lib/location.js'
import { sortByExpiry, expiryState } from '../lib/expiry.js'
import ItemRow from './ItemRow.jsx'
import StaplesBanner from './StaplesBanner.jsx'
import StaplesList from './StaplesList.jsx'
import SavedMeals from './SavedMeals.jsx'
import CategorySections from './CategorySections.jsx'
import CoachTip from './CoachTip.jsx'
import { coach, useCoachStep } from '../lib/coach.js'
import { IconSearch, IconFridge, IconPlus, IconCamera, IconWarning, IconSparkle, IconUser, IconClose, IconInfo } from '../icons.jsx'

export default function InventoryScreen({ items, onEdit, onAddManual, onGoScan, onGoChat, onAccount, onHelp, helpBadge }) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState('active') // 'active' | 'archive' | 'staples' | 'meals'
  const [place, setPlace] = useState('all') // 'all' | 'fridge' | 'freezer' | 'pantry'
  const [confirmClear, setConfirmClear] = useState(false)
  const [soonDismissed, setSoonDismissed] = useState(false)
  const coachStep = useCoachStep()

  // Reset the "tap again to clear" confirm whenever you leave the archive.
  useEffect(() => {
    if (view !== 'archive') setConfirmClear(false)
  }, [view])

  function clearArchive() {
    archived.forEach((i) => store.remove(i.id))
    setConfirmClear(false)
  }

  const active = items.filter((i) => i.status === 'active')
  const archived = items.filter((i) => i.status !== 'active')
  const sampleLoaded = items.some((i) => i.source === 'sample')
  // Sample-data button shows in dev, or on the live app when opened with ?demo
  // (e.g. your-url/?demo) so the staples feature can be seen without days of use.
  const showSeed =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo'))

  const soonCount = useMemo(
    () => active.filter((i) => ['soon', 'expired'].includes(expiryState(i))).length,
    [active]
  )

  // Counts per location for the filter chips.
  const placeCounts = useMemo(() => {
    const c = { all: active.length, fridge: 0, freezer: 0, pantry: 0 }
    active.forEach((i) => {
      if (c[i.location] !== undefined) c[i.location] += 1
    })
    return c
  }, [active])

  const visible = useMemo(() => {
    let pool = view === 'active' ? active : archived
    if (view === 'active' && place !== 'all') pool = pool.filter((i) => i.location === place)
    const q = query.trim().toLowerCase()
    const filtered = q ? pool.filter((i) => i.name.toLowerCase().includes(q)) : pool
    return sortByExpiry(filtered)
  }, [view, active, archived, query, place])

  // Upgrade a vague "other" category to a better guess from the name; leave
  // categories the user/scan already chose alone.
  const betterCategory = (i) => {
    if (i.category !== 'other') return i.category
    const g = guessCategory(i.name)
    return g !== 'other' ? g : 'other'
  }
  const needsFix = (i) => {
    const cat = betterCategory(i)
    if (cat !== i.category) return true
    // The freezer is always a deliberate choice — never treat a frozen item as
    // being in the "wrong" place, even if by name/category it'd live in the
    // fridge (e.g. leftovers you've frozen to keep for ages).
    if (i.location === 'freezer') return false
    return suggestLocation(i.name, cat) !== i.location
  }

  // Items waiting to be sorted: freshly added ("New", filed === false) plus any
  // sitting in the wrong category/place.
  const unfiledCount = useMemo(() => active.filter((i) => i.filed === false).length, [active])
  const toSortCount = useMemo(
    () => active.filter((i) => i.filed === false || needsFix(i)).length,
    [active]
  )

  function autoFile() {
    active.forEach((i) => {
      const cat = betterCategory(i)
      const patch = {}
      if (cat !== i.category) patch.category = cat
      // Respect a deliberate freezer placement — only auto-relocate items that
      // aren't already in the freezer, so frozen leftovers stay frozen.
      if (i.location !== 'freezer') {
        const loc = suggestLocation(i.name, cat)
        if (loc !== i.location) patch.location = loc
      }
      if (i.filed === false) patch.filed = true
      if (Object.keys(patch).length) store.update(i.id, patch)
    })
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="brand">
          <span className="brand-small">What's in my</span>
          <span className="brand-big">
            Fridge<svg className="leaf" viewBox="0 0 100 52" aria-hidden="true"><path d="M2 26 C 18 2, 64 2, 94 22 C 64 50, 18 50, 2 26 Z" fill="currentColor" /></svg>
          </span>
        </h1>
        <div className="header-right">
          <span className="count-pill">
            {active.length} {active.length === 1 ? 'item' : 'items'}
          </span>
          {onHelp && (
            <button className="account-btn" onClick={onHelp} aria-label={helpBadge ? "How it works & what's new (new update)" : "How it works & what's new"}>
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

      {showSeed && (
        <button
          className="dev-seed"
          onClick={() => (sampleLoaded ? clearSample() : seedSample())}
        >
          {sampleLoaded ? 'Clear sample data' : 'Load sample data'}
        </button>
      )}

      {view === 'active' && active.length > 0 && coachStep === 'organise' && (
        <CoachTip icon="🗂️" title="Now make it yours" onDismiss={() => coach.next()}>
          Tap <strong>New</strong> to file these into folders — and tap any item to set a
          use-by, mark it an <strong>essential ⭐</strong>, or flag it <strong>long-life</strong>.
        </CoachTip>
      )}

      {view === 'active' && active.length > 0 && coachStep === 'used' && (
        <CoachTip icon="✅" title="Used something up?" onDismiss={() => coach.next()}>
          Tap <strong>Used</strong> on any item when you finish it — it moves to your
          <strong> Used</strong> list, ready to pop straight back on your shopping list.
        </CoachTip>
      )}

      {view === 'active' && soonCount > 0 && !soonDismissed && (
        <div className="banner" role="status">
          <IconWarning size={18} />
          <span>
            {soonCount} {soonCount === 1 ? 'item needs' : 'items need'} using soon — they're at the top of
            the list.
          </span>
          <button className="banner-close" onClick={() => setSoonDismissed(true)} aria-label="Dismiss">
            <IconClose size={16} />
          </button>
        </div>
      )}

      {view === 'active' && <StaplesBanner items={items} />}

      <div className="segment" role="group" aria-label="Which items to show">
        <button aria-pressed={view ==='active'} onClick={() => setView('active')}>
          In stock
        </button>
        <button aria-pressed={view ==='archive'} onClick={() => setView('archive')}>
          Used
        </button>
        <button aria-pressed={view ==='staples'} onClick={() => setView('staples')}>
          Essentials
        </button>
        <button aria-pressed={view ==='meals'} onClick={() => setView('meals')}>
          Meals
        </button>
      </div>

      {view === 'active' && active.length > 0 && (
        <div className="chips loc-filter" role="group" aria-label="Filter by location">
          <button className="chip" aria-pressed={place === 'all'} onClick={() => setPlace('all')}>
            All <span className="chip-count">{placeCounts.all}</span>
          </button>
          {LOCATIONS.map((l) => (
            <button
              key={l.key}
              className="chip"
              aria-pressed={place === l.key}
              onClick={() => setPlace(l.key)}
            >
              {l.label} <span className="chip-count">{placeCounts[l.key]}</span>
            </button>
          ))}
        </div>
      )}

      {/* When there are freshly-added items, the "New" section header is the
          tap-to-file control (see CategorySections). The standalone button only
          covers the other case: items already filed but sitting in the wrong
          category/place. */}
      {view === 'active' && unfiledCount === 0 && toSortCount > 0 && (
        <button className="autofile" onClick={autoFile}>
          <IconSparkle size={17} />
          {`Tap to file ${toSortCount} ${toSortCount === 1 ? 'item' : 'items'} where they belong`}
        </button>
      )}

      {((view === 'active' && active.length > 0) || (view === 'archive' && archived.length > 0)) && (
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

      {view === 'archive' && archived.length > 0 && (
        <button
          className={`clear-archive ${confirmClear ? 'confirm' : ''}`}
          onClick={() => (confirmClear ? clearArchive() : setConfirmClear(true))}
        >
          {confirmClear ? 'Tap again to clear all' : `Clear all (${archived.length})`}
        </button>
      )}

      {view === 'staples' ? (
        <StaplesList items={items} />
      ) : view === 'meals' ? (
        <SavedMeals onGoChat={onGoChat} />
      ) : visible.length === 0 ? (
        <EmptyInventory
          view={view}
          place={place}
          hasQuery={Boolean(query.trim())}
          onAddManual={onAddManual}
          onGoScan={onGoScan}
        />
      ) : view === 'active' ? (
        <CategorySections items={visible} onEdit={onEdit} onFileNew={autoFile} />
      ) : (
        <>
          <p className="staples-intro">
            Used up or gone off. Tap <IconPlus size={13} className="inline-ico" /> to pop anything back on your
            shopping list, ready for the next shop.
          </p>
          <ul className="item-list">
            <AnimatePresence initial={false}>
              {visible.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                  onUse={(it) => store.useOne(it.id)}
                  onReadd={(it) => {
                    shopping.addUnique(it.name, it.quantity || 1)
                    store.remove(it.id)
                  }}
                />
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </div>
  )
}

function EmptyInventory({ view, place, hasQuery, onAddManual, onGoScan }) {
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
  if (view === 'active' && place !== 'all') {
    const label = LOCATIONS.find((l) => l.key === place)?.label.toLowerCase() || place
    return (
      <div className="empty">
        <div className="empty-art">
          <IconFridge size={30} />
        </div>
        <h3>Nothing in the {label}</h3>
        <p>Items you file in the {label} will show here. Tap “All” to see everything.</p>
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
        <p>Items you mark as used or thrown out land here, so you can add them back to your shopping list with one tap.</p>
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
