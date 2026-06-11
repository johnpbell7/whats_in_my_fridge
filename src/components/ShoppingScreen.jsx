import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { shopping } from '../lib/shopping.js'
import { store } from '../lib/store.js'
import { useStaples, useStaplePrefs } from '../lib/useStaples.js'
import { stapleKey, staplePrefs } from '../lib/staples.js'
import { guessCategory, CATEGORIES } from '../lib/categories.js'
import { suggestLocation } from '../lib/location.js'
import { CAT_ICON } from './CategorySections.jsx'
import { IconPlus, IconCheck, IconTrash, IconCart, IconFridge, IconPin, IconChevron, IconBox } from '../icons.jsx'

export default function ShoppingScreen({ list, items = [] }) {
  const [draft, setDraft] = useState('')
  const [toast, setToast] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const { staples, missing } = useStaples(items)
  const prefs = useStaplePrefs()

  // Look up where a known staple usually lives, so restocking it lands it back
  // in the right place (fridge/freezer/pantry) rather than a name-based guess.
  const stapleByKey = useMemo(() => {
    const m = new Map()
    for (const s of staples) m.set(s.key, s)
    return m
  }, [staples])

  // Auto-dismiss the "added to your fridge" confirmation after a moment.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // Group the still-to-buy items by category (same folders as the inventory) so
  // you can shop aisle by aisle. Category comes from a known staple if we have
  // one, otherwise a best-guess from the name. Ticked-off items collect in their
  // own section at the bottom.
  const groups = useMemo(() => {
    const catOf = (it) => stapleByKey.get(stapleKey(it.name))?.category || guessCategory(it.name)
    const open = list.filter((i) => !i.checked)
    return CATEGORIES
      .map((c) => ({ key: c.key, label: c.label, items: open.filter((i) => catOf(i) === c.key) }))
      .filter((g) => g.items.length > 0)
  }, [list, stapleByKey])
  const checkedItems = useMemo(() => list.filter((i) => i.checked), [list])

  // Staples you've run out of that aren't already on the list — one tap to add.
  const suggestions = useMemo(
    () => missing.filter((s) => !shopping.has(s.name)),
    [missing, list]
  )

  const left = list.filter((i) => !i.checked).length
  const checked = list.filter((i) => i.checked).length

  function add(e) {
    e.preventDefault()
    if (!draft.trim()) return
    shopping.add(draft)
    setDraft('')
  }

  // Mark/unmark a list item as a staple ("keep this stocked"), so we'll flag it
  // whenever you next run out. Pinning records where it usually lives so it can
  // be suggested back into the right place.
  function toggleStaple(item) {
    const key = stapleKey(item.name)
    if (prefs.pinned[key]) {
      staplePrefs.unpin(key)
    } else {
      const known = stapleByKey.get(key)
      const category = known?.category || guessCategory(item.name)
      const location = known?.location || suggestLocation(item.name, category)
      staplePrefs.pin(key, { name: item.name, location, category })
    }
  }

  // Ticked items have been bought — file each into the inventory, choosing the
  // area and a use-by from its name, then take them off the list.
  function putAway() {
    const bought = list.filter((i) => i.checked)
    if (!bought.length) return
    store.addMany(
      bought.map((it) => {
        // If this is a staple we know, put it back where it usually lives.
        const known = stapleByKey.get(stapleKey(it.name))
        const category = known?.category || guessCategory(it.name)
        const location = known?.location || suggestLocation(it.name, category)
        return {
          name: it.name,
          quantity: it.quantity || 1,
          category,
          location,
          // No use-by stored — freshness counts from today + the category's
          // window, so the card shows the item's age rather than a "use by".
          source: 'manual',
          filed: false
        }
      })
    )
    shopping.clearChecked()
    setToast(`Added ${bought.length} to your fridge`)
  }

  // One shopping row — reused inside each category section and the ticked-off one.
  function renderRow(item) {
    const isStaple = Boolean(prefs.pinned[stapleKey(item.name)])
    return (
      <motion.li
        key={item.id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -12, transition: { duration: 0.13 } }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        className={`shop-row ${item.checked ? 'done' : ''}`}
      >
        <button
          className="check"
          role="checkbox"
          aria-checked={item.checked}
          aria-label={`${item.checked ? 'Uncheck' : 'Check off'} ${item.name}`}
          onClick={() => shopping.toggle(item.id)}
        >
          {item.checked && <IconCheck size={17} />}
        </button>
        <span className="shop-name">{item.name}</span>
        <button
          className="shop-staple"
          aria-pressed={isStaple}
          onClick={() => toggleStaple(item)}
          aria-label={isStaple ? `Remove ${item.name} from your essentials` : `Add ${item.name} to your essentials`}
          title="Add to your essentials — we’ll flag it when you run out"
        >
          <IconPin size={17} />
        </button>
        <button
          className="icon-btn toss"
          onClick={() => shopping.remove(item.id)}
          aria-label={`Remove ${item.name}`}
        >
          <IconTrash size={18} />
        </button>
      </motion.li>
    )
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div>
          <h1 className="app-title">My list</h1>
          <p className="app-subtitle">
            {checked > 0
              ? `${checked} ticked off`
              : left > 0
                ? `${left} still to buy`
                : list.length
                  ? 'All picked up'
                  : 'Build your list'}
          </p>
        </div>
        {checked > 0 && (
          <button className="btn-text" onClick={() => shopping.clearChecked()}>
            Just clear
          </button>
        )}
      </header>

      {checked > 0 && (
        <button className="putaway" onClick={putAway}>
          <IconFridge size={18} />
          Put {checked} {checked === 1 ? 'item' : 'items'} away
        </button>
      )}

      <form className="search" onSubmit={add} style={{ marginBottom: 16 }}>
        <IconPlus size={18} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add something to buy"
          aria-label="Add a shopping item"
          enterKeyHint="done"
        />
        {draft.trim() && (
          <button type="submit" className="btn-text" style={{ padding: '8px 4px' }}>
            Add
          </button>
        )}
      </form>

      {suggestions.length > 0 && (
        <div className="suggest-block">
          <p className="suggest-label">Usually stocked — tap to add</p>
          <div className="chips">
            {suggestions.map((s) => (
              <button
                key={s.key}
                className="suggest-chip"
                onClick={() => shopping.addUnique(s.name)}
                aria-label={`Add ${s.name} to the list`}
              >
                <IconPlus size={14} /> {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 && suggestions.length === 0 ? (
        <div className="empty">
          <div className="empty-art">
            <IconCart size={30} />
          </div>
          <h3>Nothing on the list</h3>
          <p>Jot things down as you run low, then tick them off at the shops.</p>
        </div>
      ) : (
        <>
          {list.length > 0 && (
            <p className="shop-hint">
              <IconPin size={13} /> Grouped by aisle — tap the pin to keep something stocked.
            </p>
          )}
          <div className="cat-groups">
            {groups.map((g) => {
              const Icon = CAT_ICON[g.key] || IconBox
              const open = !collapsed[g.key]
              return (
                <section className="cat-group" key={g.key}>
                  <button
                    className={`cat-header cat-${g.key}`}
                    aria-expanded={open}
                    onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                  >
                    <span className="cat-icon"><Icon size={16} /></span>
                    <span className="cat-label">{g.label}</span>
                    <span className="cat-count">{g.items.length}</span>
                    <IconChevron size={15} className={`cat-chevron ${open ? 'open' : ''}`} />
                  </button>
                  {open && (
                    <ul className="item-list cat-items">
                      <AnimatePresence initial={false}>{g.items.map(renderRow)}</AnimatePresence>
                    </ul>
                  )}
                </section>
              )
            })}

            {checkedItems.length > 0 && (
              <section className="cat-group" key="__done">
                <button
                  className="cat-header cat-other"
                  aria-expanded={!collapsed.__done}
                  onClick={() => setCollapsed((c) => ({ ...c, __done: !c.__done }))}
                >
                  <span className="cat-icon"><IconCheck size={16} /></span>
                  <span className="cat-label">Ticked off</span>
                  <span className="cat-count">{checkedItems.length}</span>
                  <IconChevron size={15} className={`cat-chevron ${!collapsed.__done ? 'open' : ''}`} />
                </button>
                {!collapsed.__done && (
                  <ul className="item-list cat-items">
                    <AnimatePresence initial={false}>{checkedItems.map(renderRow)}</AnimatePresence>
                  </ul>
                )}
              </section>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <IconFridge size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
