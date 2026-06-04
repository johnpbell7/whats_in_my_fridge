import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { store } from '../lib/store.js'
import { CATEGORIES } from '../lib/categories.js'
import ItemRow from './ItemRow.jsx'
import {
  IconChevron, IconLeaf, IconMilk, IconFish, IconBowl, IconBottle, IconCup, IconBox, IconSparkle,
  IconBread, IconSnack, IconSpray
} from '../icons.jsx'

const CAT_ICON = {
  new: IconSparkle,
  dairy: IconMilk,
  produce: IconLeaf,
  meat: IconFish,
  bakery: IconBread,
  leftovers: IconBowl,
  condiments: IconBottle,
  drinks: IconCup,
  snacks: IconSnack,
  household: IconSpray,
  other: IconBox
}

// Groups the (already filtered + sorted) inventory into collapsible sections by
// category — each a colour-tinted titled block with a line icon. All open by
// default; tap a block to close/open it.
export default function CategorySections({ items, onEdit }) {
  const [collapsed, setCollapsed] = useState({})

  const groups = useMemo(() => {
    // Freshly added items sit in a "New" group until they're filed, and are
    // held out of their category folders while they're there.
    const newItems = items.filter((i) => i.filed === false)
    const newIds = new Set(newItems.map((i) => i.id))
    const cats = CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      items: items.filter((i) => i.category === c.key && !newIds.has(i.id))
    })).filter((g) => g.items.length > 0)
    return newItems.length ? [{ key: 'new', label: 'New', items: newItems }, ...cats] : cats
  }, [items])

  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }))

  return (
    <div className="cat-groups">
      {groups.map((g) => {
        const open = !collapsed[g.key]
        const Icon = CAT_ICON[g.key] || IconBox
        return (
          <section className="cat-group" key={g.key}>
            <button
              className={`cat-header cat-${g.key}`}
              aria-expanded={open}
              onClick={() => toggle(g.key)}
            >
              <span className="cat-icon"><Icon size={16} /></span>
              <span className="cat-label">{g.label}</span>
              <span className="cat-count">{g.items.length}</span>
              <IconChevron size={15} className={`cat-chevron ${open ? 'open' : ''}`} />
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
                      onToss={(it) => store.remove(it.id)}
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
