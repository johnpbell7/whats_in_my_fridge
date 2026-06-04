import { useState } from 'react'
import { shopping } from '../lib/shopping.js'
import { IconPlus, IconCheck, IconCart } from '../icons.jsx'

// The "To buy" row for a meal: tap a single ingredient, or "Add all". Adding
// gives clear feedback — chips flip to "Added" and the button confirms — so it's
// obvious it landed on the shopping list. Shared by chat + saved-meal cards.
export default function MealBuy({ items = [] }) {
  const [added, setAdded] = useState(() => new Set())
  if (!items.length) return null

  const addOne = (name) => {
    shopping.addUnique(name)
    setAdded((s) => new Set(s).add(name))
  }
  const addAll = () => {
    items.forEach((b) => shopping.addUnique(b))
    setAdded(new Set(items))
  }
  const allAdded = items.every((b) => added.has(b))

  return (
    <div className="meal-buy">
      <span className="meal-buy-label">To buy:</span>
      {items.map((b) => {
        const on = added.has(b)
        return (
          <button
            key={b}
            className={`buy-chip ${on ? 'added' : ''}`}
            onClick={() => !on && addOne(b)}
            aria-pressed={on}
          >
            {on ? <IconCheck size={13} /> : <IconPlus size={13} />}
            {on ? 'Added' : b}
          </button>
        )
      })}
      {items.length > 1 && (
        <button className="meal-buy-all" onClick={addAll} disabled={allAdded}>
          {allAdded ? <IconCheck size={13} /> : <IconCart size={13} />}
          {allAdded ? 'All added' : 'Add all'}
        </button>
      )}
    </div>
  )
}
