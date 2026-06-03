import { motion, AnimatePresence } from 'framer-motion'
import { shopping } from '../lib/shopping.js'
import { useShopping } from '../lib/useShopping.js'
import { staplePrefs } from '../lib/staples.js'
import { useStaples } from '../lib/useStaples.js'
import { IconPin, IconCart, IconClose, IconSparkle } from '../icons.jsx'

// The "Staples" view on the inventory screen: every item the app treats as
// frequently-stocked — whether it's in stock or run out — with controls to
// pin/unpin one or drop it from the list. Lets you see your usuals at a glance,
// not just when something has run out.
export default function StaplesList({ items }) {
  const { staples } = useStaples(items)
  const list = useShopping() // re-render when the shopping list changes

  if (staples.length === 0) {
    return (
      <div className="empty">
        <div className="empty-art">
          <IconSparkle size={30} />
        </div>
        <h3>No staples yet</h3>
        <p>
          Buy something a few times — or turn on “Keep this stocked” when adding an item — and the things
          you always keep will gather here.
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="staples-intro">
        The things you keep restocking. {staples.length} {staples.length === 1 ? 'staple' : 'staples'} —
        run-out ones are flagged so you can add them to the list.
      </p>
      <ul className="item-list">
        <AnimatePresence initial={false}>
          {staples.map((s) => {
            const onList = shopping.has(s.name)
            return (
              <motion.li
                key={s.key}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="staple-card"
              >
                <span className="staple-info">
                  <span className="staple-name">{s.name}</span>
                  <span className="staple-sub">
                    <span className={s.missing ? 'staple-status out' : 'staple-status in'}>
                      {s.missing ? 'None in stock' : `${s.activeCount} in stock`}
                    </span>
                    {s.count > 0 && <> · seen {s.count}×</>}
                    {s.pinned && <> · pinned</>}
                  </span>
                </span>

                <div className="staple-actions">
                  {s.missing &&
                    (onList ? (
                      <span className="staple-onlist">On list</span>
                    ) : (
                      <button
                        className="staple-add"
                        onClick={() => shopping.addUnique(s.name)}
                        aria-label={`Add ${s.name} to the shopping list`}
                      >
                        <IconCart size={15} /> Add
                      </button>
                    ))}
                  <button
                    className="staple-pin"
                    aria-pressed={s.pinned}
                    onClick={() =>
                      s.pinned
                        ? staplePrefs.unpin(s.key)
                        : staplePrefs.pin(s.key, { name: s.name, location: s.location, category: s.category })
                    }
                    aria-label={s.pinned ? `Unpin ${s.name}` : `Pin ${s.name} as a staple`}
                    title={s.pinned ? 'Pinned — always tracked' : 'Pin as a staple'}
                  >
                    <IconPin size={18} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => staplePrefs.ignore(s.key)}
                    aria-label={`Remove ${s.name} from staples`}
                    title="Not a staple"
                  >
                    <IconClose size={16} />
                  </button>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </>
  )
}
