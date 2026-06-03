import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { shopping } from '../lib/shopping.js'
import { store } from '../lib/store.js'
import { useStaples } from '../lib/useStaples.js'
import { guessCategory, suggestExpiry } from '../lib/categories.js'
import { suggestLocation } from '../lib/location.js'
import { IconPlus, IconCheck, IconTrash, IconCart, IconFridge } from '../icons.jsx'

export default function ShoppingScreen({ list, items = [] }) {
  const [draft, setDraft] = useState('')
  const { missing } = useStaples(items)

  // Unchecked first (newest at top), then checked at the bottom.
  const ordered = useMemo(() => {
    const open = list.filter((i) => !i.checked)
    const done = list.filter((i) => i.checked)
    return [...open, ...done]
  }, [list])

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

  // Ticked items have been bought — file each into the inventory, choosing the
  // area and a use-by from its name, then take them off the list.
  function putAway() {
    const bought = list.filter((i) => i.checked)
    if (!bought.length) return
    store.addMany(
      bought.map((it) => {
        const category = guessCategory(it.name)
        const location = suggestLocation(it.name, category)
        return {
          name: it.name,
          quantity: it.quantity || 1,
          category,
          location,
          expiry_date: suggestExpiry(category, location),
          source: 'manual'
        }
      })
    )
    shopping.clearChecked()
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div>
          <h1 className="app-title">Shopping</h1>
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
        <ul className="item-list">
          <AnimatePresence initial={false}>
            {ordered.map((item) => (
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
                  className="icon-btn toss"
                  onClick={() => shopping.remove(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  <IconTrash size={18} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
