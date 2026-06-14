import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSavedMeals } from '../lib/useSavedMeals.js'
import { savedMeals } from '../lib/meals.js'
import { store } from '../lib/store.js'
import { toast } from '../lib/toast.js'
import MealBuy from './MealBuy.jsx'
import { IconSparkle, IconTrash, IconChat, IconCheck, IconFridge, IconClose } from '../icons.jsx'

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

// The "Meals" tab: dinners/lunches you saved from the AI. Empty until you save
// one, where it nudges you to let the AI work out what to make.
export default function SavedMeals({ onGoChat }) {
  const meals = useSavedMeals()

  if (meals.length === 0) {
    return (
      <div className="empty" style={{ paddingTop: 36 }}>
        <div className="empty-art">
          <IconSparkle size={30} />
        </div>
        <h3>No saved meals yet</h3>
        <p>
          Let the AI work out what you can cook from what’s in your fridge — then save the ones you like.
          They’ll live here, ready to add their extras to your shopping list.
        </p>
        <div className="empty-actions">
          <button className="btn btn-primary" onClick={onGoChat}>
            <IconChat size={19} /> Ask the AI what to make
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="meals saved-meals">
      <AnimatePresence initial={false}>
        {meals.map((m) => (
          <MealRow key={m.id} m={m} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function MealRow({ m }) {
  // When choosing, the footer swaps to a fridge/freezer picker — cooked leftovers
  // go in the fridge (5-day window) or freezer (kept fresh for ages).
  const [choosing, setChoosing] = useState(false)

  function addLeftovers(location) {
    store.add({
      name: m.name,
      category: 'leftovers',
      location,
      source: 'manual',
      filed: true
    })
    setChoosing(false)
    toast.show(`Saved “${m.name}” to your ${location}`)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="meal-card"
    >
      <div className="meal-head">
        <h4>{m.name}</h4>
        <button
          className="icon-btn toss"
          onClick={() => savedMeals.remove(m.id)}
          aria-label={`Remove ${m.name} from saved meals`}
        >
          <IconTrash size={17} />
        </button>
      </div>
      {m.description && <p className="meal-desc">{m.description}</p>}
      {m.uses?.length > 0 && <p className="meal-uses">Uses: {m.uses.join(', ')}</p>}
      <MealBuy items={m.buy} />
      <div className="meal-foot">
        {choosing ? (
          <>
            <span className="meal-cooked-count">Save leftovers to…</span>
            <button className="meal-cooked" onClick={() => addLeftovers('fridge')}>
              Fridge
            </button>
            <button className="meal-cooked" onClick={() => addLeftovers('freezer')}>
              Freezer
            </button>
            <button className="icon-btn" onClick={() => setChoosing(false)} aria-label="Cancel">
              <IconClose size={16} />
            </button>
          </>
        ) : (
          <>
            <button className="meal-cooked" onClick={() => savedMeals.markCooked(m.id)}>
              <IconCheck size={13} /> Cooked
            </button>
            <button className="meal-cooked" onClick={() => setChoosing(true)}>
              <IconFridge size={13} /> Leftovers
            </button>
            {m.cooked_count > 0 && (
              <span className="meal-cooked-count">
                Made {m.cooked_count}×{m.last_cooked ? ` · last ${fmtDate(m.last_cooked)}` : ''}
              </span>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
