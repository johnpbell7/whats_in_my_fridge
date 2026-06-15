import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSheet } from '../lib/useSheet.js'
import { WHATS_NEW, markSeen } from '../lib/whatsnew.js'
import { IconClose, IconCamera, IconClock, IconChat, IconSparkle, IconCart, IconFridge, IconUser } from '../icons.jsx'

// Help / info centre. Reached from the "i" button by the avatar. Holds the
// how-to guide, and a "What's new" feed (see lib/whatsnew.js).

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
    title: 'Never run out of essentials',
    body: 'Mark the things you always keep as essentials. The app flags them the moment you’re low or out, and one tap adds them to your shopping list.'
  },
  {
    Icon: IconChat,
    title: 'Cooks for your diet',
    body: 'Set your dietary needs and allergies in Account — vegetarian, gluten-free, no nuts, and so on — and every meal idea and chat answer respects them.'
  },
  {
    Icon: IconCart,
    title: 'Shop, then put it away',
    body: 'Your list gathers the essentials you’re low on and extras from your dinner ideas. Tick things off as you buy, then file the whole lot back into your fridge in one tap. It all syncs across your devices.'
  },
  {
    Icon: IconFridge,
    title: 'Add to your home screen',
    body: 'Pop the app on your phone’s home screen so it opens full-screen like a normal app — no app store needed.'
  },
  {
    Icon: IconUser,
    title: 'Your free trial & credits',
    body: 'New accounts get 7 days of full Plus access — 60 photo scans and 200 chat questions a month. After that, Free gives you 10 scans and 30 questions a month. Tap your account icon at the top to check how many you’ve got left; it resets at the start of each month.'
  }
]

export default function HelpSheet({ onClose, onReplay, onInstall, onReport }) {
  const ref = useSheet(onClose)
  // Always offer the "how to add to home screen" guide here so it's reliably
  // discoverable (it's an explainer, harmless even if already installed).
  const showInstall = !!onInstall
  // opening Help counts as seeing the latest update
  useEffect(() => { markSeen() }, [])

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
            {WHATS_NEW.slice(0, 3).map((n, i) => (
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
            How to add to home screen
          </button>
        )}
        {onReport && (
          <button className="btn btn-ghost btn-block" onClick={onReport} style={{ marginTop: 10 }}>
            Report a problem
          </button>
        )}
      </motion.div>
    </div>
  )
}
