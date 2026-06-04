import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { askChat, suggestMeals } from '../lib/api.js'
import { chat } from '../lib/chat.js'
import { savedMeals } from '../lib/meals.js'
import { upgrade } from '../lib/upgrade.js'
import { expiryState } from '../lib/expiry.js'
import BuyChip from './BuyChip.jsx'
import { IconSend, IconSparkle, IconCamera, IconPlus, IconCheck, IconClose, IconBookmark } from '../icons.jsx'

const DINNER_PROMPT = 'What can I make for dinner?'
// All three openers generate meal ideas (the most useful, generative use) — the
// old "what's expiring / do I have X" lookups were already visible in the app.
const SUGGESTIONS = [DINNER_PROMPT, 'Quick lunch ideas?', 'Plan a few dinners']
const REFINE = ['More adventurous', 'Vegetarian', 'Quick & easy', 'Use up what’s expiring']

// Were the most recent suggestions a set of dinner ideas? If so, follow-ups
// should refine them rather than start a plain chat.
const lastWasMeals = (msgs) => {
  const last = [...msgs].reverse().find((m) => m.role === 'ai' || m.role === 'meals')
  return last?.role === 'meals'
}

export default function ChatScreen({ items, onGoScan, onAddManual }) {
  // Conversation persists across tab switches / reloads (cleared on account change).
  const messages = useSyncExternalStore(chat.subscribe, chat.getAll, chat.getAll)
  const setMessages = (updater) =>
    chat.setAll(typeof updater === 'function' ? updater(chat.getAll()) : updater)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  // In "dinner" mode the input refines the meal ideas. Initialised from history
  // so a refresh mid-planning keeps refining.
  const [dinnerMode, setDinnerMode] = useState(() => lastWasMeals(chat.getAll()))
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
    // While planning dinner, a typed message refines the ideas.
    if (dinnerMode) {
      askDinner(question)
      return
    }
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

  // Dinner ideas: one chat-model request that returns structured meals so we can
  // show cards with "to buy" items you can tap straight onto the shopping list.
  // Same credit cost as any chat message. An optional `refine` (typed follow-up
  // or a refine chip) tailors the next set of ideas.
  async function askDinner(refine) {
    if (busy) return
    const refineText = typeof refine === 'string' && refine.trim() ? refine.trim() : null
    setMessages((m) => [...m, { role: 'me', text: refineText || DINNER_PROMPT }])
    setDinnerMode(true)
    setBusy(true)
    try {
      const meals = await suggestMeals(buildInventory(), refineText || undefined)
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
        {messages.length > 0 && (
          <button
            className="btn-text"
            onClick={() => {
              chat.clear()
              setDinnerMode(false)
            }}
          >
            Clear chat
          </button>
        )}
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
              <button key={s} onClick={() => askDinner(s === DINNER_PROMPT ? undefined : s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {dinnerMode && messages.length > 0 && !busy && (
          <div className="suggest-row refine-row">
            {REFINE.map((r) => (
              <button key={r} onClick={() => askDinner(r)}>
                {r}
              </button>
            ))}
            <button className="refine-exit" onClick={() => setDinnerMode(false)}>
              <IconClose size={13} /> Ask something else
            </button>
          </div>
        )}

        <div className="chat-input">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={dinnerMode ? 'Refine the ideas… (e.g. vegetarian, quick)' : 'Ask about your fridge…'}
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

// Renders the structured meal suggestions as cards you can save.
function MealList({ meals }) {
  if (!meals || meals.length === 0) {
    return (
      <p className="meals-empty">
        Not quite enough to suggest a meal yet — add a few more things and ask again.
      </p>
    )
  }
  return (
    <div className="meals">
      <p className="meals-intro">Here’s what you could make:</p>
      {meals.map((meal, i) => (
        <MealCard key={i} meal={meal} />
      ))}
    </div>
  )
}

function MealCard({ meal }) {
  const saved = useSyncExternalStore(
    savedMeals.subscribe,
    () => savedMeals.has(meal.name),
    () => savedMeals.has(meal.name)
  )
  return (
    <div className="meal-card">
      <div className="meal-head">
        <h4>{meal.name}</h4>
        <button
          className={`meal-save ${saved ? 'on' : ''}`}
          onClick={() => savedMeals.add(meal)}
          disabled={saved}
          aria-pressed={saved}
        >
          {saved ? <IconCheck size={13} /> : <IconBookmark size={13} />}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {meal.description && <p className="meal-desc">{meal.description}</p>}
      {meal.uses?.length > 0 && <p className="meal-uses">Uses: {meal.uses.join(', ')}</p>}
      {meal.buy?.length > 0 && (
        <div className="meal-buy">
          <span className="meal-buy-label">To buy:</span>
          {meal.buy.map((b) => (
            <BuyChip key={b} name={b} />
          ))}
        </div>
      )}
    </div>
  )
}
