import { motion } from 'framer-motion'
import { useSheet } from '../lib/useSheet.js'
import { isStandalone, isMobile } from '../lib/install.js'
import { IconClose, IconCamera, IconClock, IconChat, IconSparkle, IconCart, IconFridge } from '../icons.jsx'

// Help / info centre. Reached from the "i" button by the avatar. Holds the
// how-to guide, and a "What's new" feed — add an entry to WHATS_NEW whenever a
// feature ships and it'll surface here for everyone.

const WHATS_NEW = [
  {
    date: 'Jun 2026',
    text: 'New chat shortcuts — “Use what’s expiring”, “No extra shopping”, plus breakfast, healthy & light and freezer-friendly meal ideas.'
  },
  {
    date: 'Jun 2026',
    text: 'A nudge on the chat screen when food needs using up — tap it for instant meal ideas built around what’s about to go off.'
  }
]

const HOWTO = [
  {
    Icon: IconCamera,
    title: 'Add your food fast',
    body: 'Just back from the shop? Lay it out and snap a photo, or scan the receipt — it lists everything for you. Split a big shop into 2–3 photos for the best read. You can always add items by hand too.'
  },
  {
    Icon: IconClock,
    title: 'Use it before you lose it',
    body: 'Every item tracks how long you’ve had it. Anything getting old floats to the top with an amber-then-red nudge, so good food doesn’t end up in the bin.'
  },
  {
    Icon: IconChat,
    title: 'Ask what to cook',
    body: 'Open Chat and tap a prompt — “Dinner ideas”, “Use what’s expiring”, “No extra shopping”. You get real meals from what you have. Save the ones you love and add any missing bits to your list in a tap.'
  },
  {
    Icon: IconSparkle,
    title: 'Never run out of staples',
    body: 'Mark the things you always keep as staples. The app flags them the moment you’re low or out, and one tap adds them to your shopping list.'
  },
  {
    Icon: IconCart,
    title: 'Shop, then put it away',
    body: 'Your list gathers the staples you’re low on and extras from your dinner ideas. Tick things off as you buy, then file the whole lot back into your fridge in one tap. It all syncs across your devices.'
  },
  {
    Icon: IconFridge,
    title: 'Add to your home screen',
    body: 'Pop the app on your phone’s home screen so it opens full-screen like a normal app — no app store needed.'
  }
]

export default function HelpSheet({ onClose, onReplay, onInstall }) {
  const ref = useSheet(onClose)
  const showInstall = onInstall && isMobile() && !isStandalone()

  return (
    <div className="scrim" onClick={onClose}>
      <motion.div
        className="sheet help-sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2 id="help-title">How it works</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        {WHATS_NEW.length > 0 && (
          <div className="help-new">
            <div className="help-new-head"><IconSparkle size={15} /> What’s new</div>
            {WHATS_NEW.map((n, i) => (
              <div className="help-new-row" key={i}>
                <span className="help-new-date">{n.date}</span>
                <span>{n.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="help-list">
          {HOWTO.map(({ Icon, title, body }) => (
            <div className="help-item" key={title}>
              <span className="help-ico"><Icon size={18} /></span>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-ghost btn-block" onClick={onReplay}>
          Replay the walkthrough
        </button>
        {showInstall && (
          <button className="btn btn-ghost btn-block" onClick={onInstall} style={{ marginTop: 10 }}>
            Add to home screen
          </button>
        )}
      </motion.div>
    </div>
  )
}
