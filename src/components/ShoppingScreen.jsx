import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { shopping } from '../lib/shopping.js'
import { store } from '../lib/store.js'
import { useStaples, useStaplePrefs } from '../lib/useStaples.js'
import { stapleKey, staplePrefs } from '../lib/staples.js'
import { guessCategory, CATEGORIES } from '../lib/categories.js'
import { suggestLocation } from '../lib/location.js'
import { CAT_ICON } from './CategorySections.jsx'
import CoachTip from './CoachTip.jsx'
import { coach, useCoachStep } from '../lib/coach.js'
import { IconPlus, IconCheck, IconTrash, IconCart, IconFridge, IconPin, IconChevron, IconBox, IconSend, IconSparkle } from '../icons.jsx'

export default function ShoppingScreen({ list, items = [] }) {
  const [draft, setDraft] = useState('')
  const [toast, setToast] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const { staples, missing } = useStaples(items)
  const prefs = useStaplePrefs()
  const coachStep = useCoachStep()

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

  // Things you've recently marked "Used" that aren't on the list or back in
  // stock — a strong "you just ran out" signal, newest first.
  const usedUp = useMemo(() => {
    const onList = new Set(list.map((i) => i.name.trim().toLowerCase()))
    const inStock = new Set(
      items.filter((i) => i.status === 'active').map((i) => i.name.trim().toLowerCase())
    )
    const seen = new Set()
    return items
      .filter((i) => i.status !== 'active')
      .sort((a, b) => Date.parse(b.updated_at || b.added_date || 0) - Date.parse(a.updated_at || a.added_date || 0))
      .filter((i) => {
        const k = i.name.trim().toLowerCase()
        if (!k || onList.has(k) || inStock.has(k) || seen.has(k)) return false
        seen.add(k)
        return true
      })
      .slice(0, 6)
  }, [items, list])

  // Staples you've run out of that aren't already on the list, or already shown
  // under "just used up" — one tap to add.
  const suggestions = useMemo(() => {
    const usedKeys = new Set(usedUp.map((i) => i.name.trim().toLowerCase()))
    return missing.filter(
      (s) => !shopping.has(s.name) && !usedKeys.has(s.name.trim().toLowerCase())
    )
  }, [missing, list, usedUp])

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

  // Ticking an item off files it straight into the inventory's "New" section —
  // so there's no separate "put away" step to forget. Unticking pulls that item
  // back out. The row itself stays in the list's "Ticked off" group until you
  // tap Clear list.
  function toggleBought(item) {
    if (!item.checked) {
      // If this is a staple we know, file it where it usually lives.
      const known = stapleByKey.get(stapleKey(item.name))
      const category = known?.category || guessCategory(item.name)
      const location = known?.location || suggestLocation(item.name, category)
      const filed = store.add({
        name: item.name,
        quantity: item.quantity || 1,
        category,
        location,
        // No use-by — freshness counts from today + the category's window.
        source: 'manual',
        filed: false
      })
      shopping.patch(item.id, { checked: true, filed_id: filed?.id || null })
      // Ticking one off is the "it files straight into your fridge" moment — once
      // they've felt it, move the coach on to the dinner tip.
      if (coach.step() === 'shop') coach.next()
    } else {
      // Untick: pull the item we just filed back out of the fridge, then clear
      // the tick. (filed_id is on-device only, so this undoes ticks made here.)
      if (item.filed_id) store.remove(item.filed_id)
      shopping.patch(item.id, { checked: false, filed_id: null })
    }
  }

  // Share the list as plain text via the OS share sheet (WhatsApp, Messages,
  // email, anything installed); falls back to the clipboard where share isn't
  // available. The note reminds whoever shops that buying it elsewhere doesn't
  // update the fridge — that happens by scanning the receipt or ticking items
  // off back in the app.
  async function sendList() {
    const toBuy = list.filter((i) => !i.checked)
    const rows = (toBuy.length ? toBuy : list).map((i) => {
      const qty = i.quantity > 1 ? ` ×${i.quantity}` : ''
      return `• ${i.name}${qty}`
    })
    const text =
      `🛒 Shopping list\n\n${rows.join('\n')}\n\n` +
      `— Sent from What's in my Fridge.\n` +
      `Once it's home, scan the receipt or tick the items off in the app to add them to your fridge.`

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Shopping list', text })
      } else {
        await navigator.clipboard.writeText(text)
        setToast('List copied — paste it anywhere')
      }
    } catch (err) {
      // A plain "user cancelled the share sheet" isn't an error — stay quiet.
      if (err?.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(text)
        setToast('List copied — paste it anywhere')
      } catch {
        setToast("Couldn't share the list just now")
      }
    }
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
          onClick={() => toggleBought(item)}
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {left > 0 && (
            <button
              className="btn-text"
              onClick={sendList}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <IconSend size={15} /> Send list
            </button>
          )}
          {checked > 0 && (
            <button className="btn-text" onClick={() => shopping.clearChecked()}>
              Clear list
            </button>
          )}
        </div>
      </header>

      {coachStep === 'shop' && (
        <CoachTip icon="🛒" title="The clever bit" onDismiss={() => coach.next()}>
          Tick things off as you buy them and each one files <strong>straight into your
          fridge</strong> — no re-typing. Add something to your list and give it a go.
        </CoachTip>
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

      <p className="shop-hint shop-tip">
        <IconSparkle size={13} />
        <span>
          No need to type it all — add in a tap from what you’ve just used up, or your essentials on the{' '}
          <strong>Fridge</strong> tab.
        </span>
      </p>

      {(usedUp.length > 0 || suggestions.length > 0) && (
        <div className="suggest-block">
          {usedUp.length > 0 && (
            <>
              <p className="suggest-label">Just used up — tap to re-add</p>
              <div className="suggest-scroll">
                {usedUp.map((s) => (
                  <button
                    key={s.id}
                    className="suggest-chip"
                    onClick={() => shopping.addUnique(s.name, s.quantity || 1)}
                    aria-label={`Add ${s.name} to the list`}
                  >
                    <IconPlus size={14} /> {s.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {suggestions.length > 0 && (
            <>
              <p className="suggest-label" style={usedUp.length > 0 ? { marginTop: 12 } : undefined}>
                Usually stocked — tap to add
              </p>
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
            </>
          )}
        </div>
      )}

      {list.length === 0 && suggestions.length === 0 && usedUp.length === 0 ? (
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
                  <span
                    className="cat-label"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, lineHeight: 1.15 }}
                  >
                    Ticked off
                    <small className="cat-file-hint">Added to New in My food</small>
                  </span>
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
