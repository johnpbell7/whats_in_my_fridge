import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { shopping } from '../lib/shopping.js'
import { useShopping } from '../lib/useShopping.js'
import { staplePrefs } from '../lib/staples.js'
import { useStaples } from '../lib/useStaples.js'
import { toast } from '../lib/toast.js'
import { IconPin, IconCart, IconClose } from '../icons.jsx'

// Quick "how do I add a staple?" explainer — the flow is: open an item, then
// flip "Keep this stocked". Shown big in the empty state, and as a dismissible
// tip the first time the list has staples in it.
const TIP_KEY = 'fridge.staples.tip'
function HowToAddStaple() {
  return (
    <ol className="staple-how">
      <li><span className="staple-how-num">1</span><span>Tap any item in your fridge</span></li>
      <li><span className="staple-how-num">2</span><span>In the item window, turn on <strong>Keep this stocked</strong> <IconPin size={13} /></span></li>
      <li><span className="staple-how-num">3</span><span>It lives here, and gets flagged whenever you run out</span></li>
    </ol>
  )
}

// The "Staples" view on the inventory screen: every item the app treats as
// frequently-stocked — whether it's in stock or run out — with controls to
// pin/unpin one or drop it from the list. Lets you see your usuals at a glance,
// not just when something has run out.
export default function StaplesList({ items }) {
  const { staples } = useStaples(items)
  const list = useShopping() // re-render when the shopping list changes
  const [tipSeen, setTipSeen] = useState(() => {
    try { return localStorage.getItem(TIP_KEY) === '1' } catch { return false }
  })
  function dismissTip() {
    try { localStorage.setItem(TIP_KEY, '1') } catch { /* private mode */ }
    setTipSeen(true)
  }

  if (staples.length === 0) {
    return (
      <div className="empty">
        <div className="empty-art">
          <IconPin size={28} />
        </div>
        <h3>No essentials yet</h3>
        <p>Essentials are the things you always keep in — milk, butter, eggs. Here’s how to add one:</p>
        <div className="staple-how-card"><HowToAddStaple /></div>
      </div>
    )
  }

  return (
    <>
      {!tipSeen && (
        <div className="staple-tip">
          <button className="staple-tip-x" onClick={dismissTip} aria-label="Dismiss tip">
            <IconClose size={15} />
          </button>
          <div className="staple-tip-head"><IconPin size={15} /> How to add an essential</div>
          <HowToAddStaple />
        </div>
      )}
      <p className="staples-intro">
        The things you keep restocking. {staples.length} {staples.length === 1 ? 'essential' : 'essentials'} —
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
                        onClick={() => {
                          shopping.addUnique(s.name)
                          toast.show('Added to your shopping list')
                        }}
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
                    aria-label={s.pinned ? `Unpin ${s.name}` : `Pin ${s.name} as an essential`}
                    title={s.pinned ? 'Pinned — always tracked' : 'Pin as an essential'}
                  >
                    <IconPin size={18} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => staplePrefs.ignore(s.key)}
                    aria-label={`Remove ${s.name} from essentials`}
                    title="Not an essential"
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
