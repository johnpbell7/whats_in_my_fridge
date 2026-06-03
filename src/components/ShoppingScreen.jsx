import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { shopping } from '../lib/shopping.js'
import { IconPlus, IconCheck, IconTrash, IconCart } from '../icons.jsx'

export default function ShoppingScreen({ list }) {
  const [draft, setDraft] = useState('')

  // Unchecked first (newest at top), then checked at the bottom.
  const ordered = useMemo(() => {
    const open = list.filter((i) => !i.checked)
    const done = list.filter((i) => i.checked)
    return [...open, ...done]
  }, [list])

  const left = list.filter((i) => !i.checked).length
  const checked = list.filter((i) => i.checked).length

  function add(e) {
    e.preventDefault()
    if (!draft.trim()) return
    shopping.add(draft)
    setDraft('')
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div>
          <h1 className="app-title">Shopping</h1>
          <p className="app-subtitle">
            {left > 0 ? `${left} still to buy` : list.length ? 'All picked up' : 'Build your list'}
          </p>
        </div>
        {checked > 0 && (
          <button className="btn-text" onClick={() => shopping.clearChecked()}>
            Clear {checked} done
          </button>
        )}
      </header>

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

      {list.length === 0 ? (
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
