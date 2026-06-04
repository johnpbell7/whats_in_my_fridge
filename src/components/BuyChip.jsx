import { useState } from 'react'
import { shopping } from '../lib/shopping.js'
import { IconPlus, IconCheck } from '../icons.jsx'

// A "to buy" ingredient — tap to drop it onto the shopping list (no duplicates).
export default function BuyChip({ name }) {
  const [added, setAdded] = useState(false)
  function add() {
    if (added) return
    shopping.addUnique(name)
    setAdded(true)
  }
  return (
    <button className={`buy-chip ${added ? 'added' : ''}`} onClick={add} aria-pressed={added}>
      {added ? <IconCheck size={13} /> : <IconPlus size={13} />}
      {added ? 'Added' : name}
    </button>
  )
}
