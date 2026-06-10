import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { shopping } from '../lib/shopping.js'
import { useShopping } from '../lib/useShopping.js'
import { staplePrefs } from '../lib/staples.js'
import { useStaples } from '../lib/useStaples.js'
import { toast } from '../lib/toast.js'
import { locationLabel } from '../lib/categories.js'
import { IconCart, IconClose, IconSparkle } from '../icons.jsx'

// "You usually keep these, but they're not in stock." Shown on the inventory
// screen so a missing staple is the first thing you notice when you open up.
export default function StaplesBanner({ items }) {
  const { missing } = useStaples(items)
  const list = useShopping()

  // Don't nag about staples that are already on the shopping list — so adding
  // one (or dismissing it) animates the row out of the banner.
  const toShow = useMemo(
    () => missing.filter((s) => !shopping.has(s.name)),
    [missing, list]
  )

  if (toShow.length === 0) return null

  return (
    <section className="staples" aria-label="Essentials running low">
      <div className="staples-head">
        <IconSparkle size={17} />
        <div>
          <strong>Running low on the usuals</strong>
          <p>
            {toShow.length === 1
              ? "You normally keep this, but there's none in stock."
              : 'You normally keep these, but none are in stock.'}
          </p>
        </div>
      </div>

      <ul className="staple-list">
        <AnimatePresence initial={false}>
          {toShow.map((s) => (
            <motion.li
              key={s.key}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="staple-row"
            >
              <span className="staple-info">
                <span className="staple-name">{s.name}</span>
                <span className="staple-sub">
                  {s.pinned ? 'Pinned essential' : `Usually in the ${locationLabel(s.location).toLowerCase()}`}
                </span>
              </span>

              <div className="staple-actions">
                <button
                  className="staple-add"
                  onClick={() => {
                    shopping.addUnique(s.name)
                    toast.show('Added to your shopping list')
                  }}
                  aria-label={`Add ${s.name} to the shopping list`}
                >
                  <IconCart size={15} /> Add
                </button>
                <button
                  className="icon-btn"
                  onClick={() => staplePrefs.ignore(s.key)}
                  aria-label={`${s.name} isn't an essential — stop suggesting it`}
                  title="Not an essential"
                >
                  <IconClose size={16} />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}
