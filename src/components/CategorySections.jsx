import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { store } from '../lib/store.js'
import { CATEGORIES } from '../lib/categories.js'
import ItemRow from './ItemRow.jsx'
import { IconChevron } from '../icons.jsx'

// Groups the (already filtered + sorted) inventory into collapsible sections by
// category — Produce, Dairy, Condiments, etc. Each header expands/collapses.
export default function CategorySections({ items, onEdit }) {
  const [collapsed, setCollapsed] = useState({})

  const groups = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        key: c.key,
        label: c.label,
        items: items.filter((i) => i.category === c.key)
      })).filter((g) => g.items.length > 0),
    [items]
  )

  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }))

  return (
    <div className="cat-groups">
      {groups.map((g) => {
        const open = !collapsed[g.key]
        return (
          <section className="cat-group" key={g.key}>
            <button
              className="cat-header"
              aria-expanded={open}
              onClick={() => toggle(g.key)}
            >
              <IconChevron size={16} className={`cat-chevron ${open ? 'open' : ''}`} />
              <span className="cat-label">{g.label}</span>
              <span className="cat-count">{g.items.length}</span>
            </button>
            {open && (
              <ul className="item-list cat-items">
                <AnimatePresence initial={false}>
                  {g.items.map((item) => (
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
          </section>
        )
      })}
    </div>
  )
}
