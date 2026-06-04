import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { askChat, suggestMeals } from '../lib/api.js'
import { shopping } from '../lib/shopping.js'
import { upgrade } from '../lib/upgrade.js'
import { expiryState } from '../lib/expiry.js'
import { IconSend, IconSparkle, IconCamera, IconPlus, IconCheck } from '../icons.jsx'

const DINNER_PROMPT = 'What can I make for dinner?'
const SUGGESTIONS = ["What's expiring soon?", 'Do I have eggs?', DINNER_PROMPT]

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

  const buildInventory = () =>
    active.map((i) => ({
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      location: i.location,
      expiry_date: i.expiry_date,
      expiry: expiryState(i)
    }))

  // Shared error handling for both flows.
  function handleError(err) {
    if (err.code === 'quota_exceeded' || err.code === 'rate_limited') {
      upgrade.show(err.code === 'rate_limited' ? 'rate' : 'chat')
    } else {
      setMessages((m) => [...m, { role: 'error', text: err.message }])
    }
  }

  async function send(text) {
    const question = (text ?? draft).trim()
    if (!question || busy) return
    setDraft('')
    setMessages((m) => [...m, { role: 'me', text: question }])
    setBusy(true)
    try {
      const answer = await askChat(question, buildInventory())
      setMessages((m) => [...m, { role: 'ai', text: answer }])
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  // Dinner ideas: one chat-model request that returns structured meals so we
  // can show cards with "to buy" items you can tap straight onto the shopping
  // list. Same credit cost as any chat message.
  async function askDinner() {
    if (busy) return
    setMessages((m) => [...m, { role: 'me', text: DINNER_PROMPT }])
    setBusy(true)
    try {
      const meals = await suggestMeals(buildInventory())
      setMessages((m) => [...m, { role: 'meals', meals }])
    } catch (err) {
      handleError(err)
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
                className={m.role === 'meals' ? 'meals-msg' : `bubble ${m.role}`}
              >
                {m.role === 'meals' ? <MealList meals={m.meals} /> : m.text}
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
              <button key={s} onClick={() => (s === DINNER_PROMPT ? askDinner() : send(s))}>
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

// Renders the structured dinner suggestions as cards.
function MealList({ meals }) {
  if (!meals || meals.length === 0) {
    return (
      <p className="meals-empty">
        Not quite enough to suggest a dinner yet — add a few more things and ask again.
      </p>
    )
  }
  return (
    <div className="meals">
      <p className="meals-intro">Here’s what you could make:</p>
      {meals.map((meal, i) => (
        <div className="meal-card" key={i}>
          <h4>{meal.name}</h4>
          {meal.description && <p className="meal-desc">{meal.description}</p>}
          {meal.uses?.length > 0 && (
            <p className="meal-uses">Uses: {meal.uses.join(', ')}</p>
          )}
          {meal.buy?.length > 0 && (
            <div className="meal-buy">
              <span className="meal-buy-label">To buy:</span>
              {meal.buy.map((b) => (
                <BuyChip key={b} name={b} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// A "to buy" item — tap to drop it onto the shopping list (no duplicates).
function BuyChip({ name }) {
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
