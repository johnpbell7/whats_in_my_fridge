import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { askChat } from '../lib/api.js'
import { upgrade } from '../lib/upgrade.js'
import { expiryState } from '../lib/expiry.js'
import { IconSend, IconSparkle, IconCamera, IconPlus } from '../icons.jsx'

const SUGGESTIONS = ["What's expiring soon?", 'Do I have eggs?', 'What can I make for dinner?']

export default function ChatScreen({ items, onGoScan, onAddManual }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const logRef = useRef(null)

  const active = items.filter((i) => i.status === 'active')

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  async function send(text) {
    const question = (text ?? draft).trim()
    if (!question || busy) return
    setDraft('')
    setMessages((m) => [...m, { role: 'me', text: question }])
    setBusy(true)
    try {
      const inventory = active.map((i) => ({
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        location: i.location,
        expiry_date: i.expiry_date,
        expiry: expiryState(i)
      }))
      const answer = await askChat(question, inventory)
      setMessages((m) => [...m, { role: 'ai', text: answer }])
    } catch (err) {
      // At a cap or rate-limit, open the upgrade prompt instead of a raw error.
      if (err.code === 'quota_exceeded' || err.code === 'rate_limited') {
        upgrade.show(err.code === 'rate_limited' ? 'rate' : 'chat')
      } else {
        setMessages((m) => [...m, { role: 'error', text: err.message }])
      }
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Chat only makes sense once there's something to talk about — guide empty
  // fridges to add items first rather than asking about nothing.
  if (active.length === 0) {
    return (
      <div className="screen chat-screen">
        <header className="app-header" style={{ marginBottom: 8 }}>
          <div>
            <h1 className="app-title">Ask</h1>
            <p className="app-subtitle">Add to your fridge to get started.</p>
          </div>
        </header>
        <div className="empty" style={{ paddingTop: 40 }}>
          <div className="empty-art">
            <IconSparkle size={30} />
          </div>
          <h3>Nothing to ask about yet</h3>
          <p>Add a few things to your fridge and I can tell you what’s expiring or what you could cook.</p>
          <div className="empty-actions">
            <button className="btn btn-primary" onClick={onGoScan}>
              <IconCamera size={19} /> Scan a photo
            </button>
            <button className="btn btn-ghost" onClick={onAddManual}>
              <IconPlus size={19} /> Add by hand
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen chat-screen">
      <header className="app-header" style={{ marginBottom: 8 }}>
        <div>
          <h1 className="app-title">Ask</h1>
          <p className="app-subtitle">
            {active.length} {active.length === 1 ? 'item' : 'items'} in the fridge right now.
          </p>
        </div>
      </header>

      <div className="chat">
        <div className="chat-log" ref={logRef}>
          {messages.length === 0 && (
            <div className="empty" style={{ paddingTop: 32 }}>
              <div className="empty-art">
                <IconSparkle size={30} />
              </div>
              <h3>Ask about your fridge</h3>
              <p>Check what's in, what's going off, or what to cook — handy while you're at the shops.</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className={`bubble ${m.role}`}
              >
                {m.text}
              </motion.div>
            ))}
          </AnimatePresence>

          {busy && (
            <div className="bubble ai">
              <span className="typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="suggest-row">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="chat-input">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about your fridge…"
            aria-label="Your question"
          />
          <button className="send-btn" onClick={() => send()} disabled={!draft.trim() || busy} aria-label="Send">
            <IconSend size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
