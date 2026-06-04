import { motion, AnimatePresence } from 'framer-motion'
import { useSavedMeals } from '../lib/useSavedMeals.js'
import { savedMeals } from '../lib/meals.js'
import { shopping } from '../lib/shopping.js'
import BuyChip from './BuyChip.jsx'
import { IconSparkle, IconTrash, IconChat, IconCart } from '../icons.jsx'

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
          <motion.div
            key={m.id}
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
            {m.buy?.length > 0 && (
              <div className="meal-buy">
                <span className="meal-buy-label">To buy:</span>
                {m.buy.map((b) => (
                  <BuyChip key={b} name={b} />
                ))}
                {m.buy.length > 1 && (
                  <button
                    className="meal-buy-all"
                    onClick={() => m.buy.forEach((b) => shopping.addUnique(b))}
                  >
                    <IconCart size={13} /> Add all
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
