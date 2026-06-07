import { useState } from 'react'
import { shopping } from '../lib/shopping.js'
import { IconPlus, IconCheck, IconCart } from '../icons.jsx'

// The "To buy" row for a meal: tap a single ingredient, or "Add all". Adding
// gives clear feedback — chips flip to "Added" and the button confirms — so it's
// obvious it landed on the shopping list. Shared by chat + saved-meal cards.
// Items may be plain names ("eggs") or objects with an amount ({ name, qty }).
export default function MealBuy({ items = [] }) {
  const norm = (items || [])
    .map((it) => (typeof it === 'string' ? { name: it } : it))
    .filter((it) => it && it.name)
  const [added, setAdded] = useState(() => new Set())
  if (!norm.length) return null

  const addOne = (name) => {
    shopping.addUnique(name)
    setAdded((s) => new Set(s).add(name))
  }
  const addAll = () => {
    norm.forEach((b) => shopping.addUnique(b.name))
    setAdded(new Set(norm.map((b) => b.name)))
  }
  const allAdded = norm.every((b) => added.has(b.name))

  return (
    <div className="meal-buy">
      <span className="meal-buy-label">To buy:</span>
      {norm.map((b) => {
        const on = added.has(b.name)
        const label = b.qty ? `${b.name} · ${b.qty}` : b.name
        return (
          <button
            key={b.name}
            className={`buy-chip ${on ? 'added' : ''}`}
            onClick={() => !on && addOne(b.name)}
            aria-pressed={on}
          >
            {on ? <IconCheck size={13} /> : <IconPlus size={13} />}
            {on ? 'Added' : label}
          </button>
        )
      })}
      {norm.length > 1 && (
        <button className="meal-buy-all" onClick={addAll} disabled={allAdded}>
          {allAdded ? <IconCheck size={13} /> : <IconCart size={13} />}
          {allAdded ? 'All added' : 'Add all'}
        </button>
      )}
    </div>
  )
}
