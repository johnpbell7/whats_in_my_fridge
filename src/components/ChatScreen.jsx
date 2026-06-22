import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { askChat, suggestMeals, checkDish, aiErrorMessage } from '../lib/api.js'
import { chat } from '../lib/chat.js'
import { savedMeals } from '../lib/meals.js'
import { upgrade } from '../lib/upgrade.js'
import { expiryState, isLongLife } from '../lib/expiry.js'
import { staplePrefs } from '../lib/staples.js'
import { hasDiet } from '../lib/diet.js'
import MealBuy from './MealBuy.jsx'
import CoachTip from './CoachTip.jsx'
import { coach, useCoachStep } from '../lib/coach.js'
import { IconSend, IconSparkle, IconCamera, IconPlus, IconCheck, IconClose, IconBookmark, IconWarning, IconChevron } from '../icons.jsx'

const DINNER_PROMPT = 'What can I make for dinner?'
// Opener chips. All generate structured meal ideas (the most useful, generative
// use) — the old "what's expiring / do I have X" lookups are already visible in
// the app. Each has a short label and the actual question sent to the AI.
// `needsFridge` chips are hidden when the user isn't tracking a fridge yet
// (they only make sense against real inventory).
const SUGGESTIONS = [
  { label: '🍳 Cook a specific dish', dish: true }, // asks for a dish, then checks have/need
  { label: 'Dinner ideas', prompt: null }, // null → the plain DINNER_PROMPT
  { label: 'Use what’s expiring', prompt: 'What can I make using the things expiring soonest?', needsFridge: true },
  { label: 'No extra shopping', prompt: 'What can I make using only what I already have — nothing to buy?', needsFridge: true },
  { label: 'Quick lunch', prompt: 'Quick lunch ideas?' },
  { label: 'Breakfast ideas', prompt: 'Breakfast ideas?' },
  { label: 'Healthy & light', prompt: 'Something healthy and light I could make?' },
  { label: 'Freezer-friendly', prompt: 'Meals I could batch-cook and freeze?' },
  { label: 'Plan a few dinners', prompt: 'Plan a few different dinners I could make over the next few days.' }
]
const REFINE = ['More adventurous', 'Vegetarian', 'Quick & easy', 'Use up what’s expiring']

// Were the most recent suggestions a set of dinner ideas? If so, follow-ups
// should refine them rather than start a plain chat.
const lastWasMeals = (msgs) => {
  const last = [...msgs].reverse().find((m) => m.role === 'ai' || m.role === 'meals')
  return last?.role === 'meals'
}
// Was the last exchange a "specific dish" check? If so, a typed message names
// another dish to check rather than starting a plain chat.
const lastWasDish = (msgs) => {
  const last = [...msgs].reverse().find((m) => m.role === 'ai' || m.role === 'meals' || m.role === 'dish')
  return last?.role === 'dish' || (last?.role === 'ai' && last.dishPrompt === true)
}

export default function ChatScreen({ items, onGoScan, onAddManual, onAccount }) {
  // Nudge to set dietary needs, until they have. Read once per mount — good
  // enough for a hint (the tab remounts on switch, so it clears once set).
  const showDietHint = Boolean(onAccount) && !hasDiet(staplePrefs.getDiet())
  // Conversation persists across tab switches / reloads (cleared on account change).
  const messages = useSyncExternalStore(chat.subscribe, chat.getAll, chat.getAll)
  const setMessages = (updater) =>
    chat.setAll(typeof updater === 'function' ? updater(chat.getAll()) : updater)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  // In "dinner" mode the input refines the meal ideas. Initialised from history
  // so a refresh mid-planning keeps refining.
  const [dinnerMode, setDinnerMode] = useState(() => lastWasMeals(chat.getAll()))
  // In "dish" mode a typed message names a dish to check (have vs. still need).
  const [dishMode, setDishMode] = useState(() => lastWasDish(chat.getAll()))
  // Expiring-items quick-pick: after the first dinner ideas, the user taps the
  // soonest-expiring items to refocus the next batch of recipes on using them up.
  // Once they've done that (refined=true), the normal refine chips take over.
  const [picked, setPicked] = useState([])
  const [refined, setRefined] = useState(false)
  // Tapping the "use up soon" nudge opens this picker FIRST (no AI call) so you
  // can choose which expiring items to cook with before spending a credit.
  const [picking, setPicking] = useState(false)
  const logRef = useRef(null)
  const coachStep = useCoachStep()

  const active = items.filter((i) => i.status === 'active')
  // Items at or past their freshness window — the ones worth cooking first.
  const urgent = active.filter((i) => {
    const s = expiryState(i)
    return s === 'soon' || s === 'expired'
  })
  // De-duplicated by name for the quick-pick chips (you only need one "Eggs"),
  // soonest-expiring first.
  const urgentPick = [...new Map(urgent.map((i) => [i.name.toLowerCase(), i])).values()]

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
      expiry: expiryState(i),
      keeps: isLongLife(i) ? 'long-life' : 'fresh'
    }))

  // Shared error handling for both flows.
  function handleError(err) {
    if (err.code === 'quota_exceeded' || err.code === 'rate_limited') {
      upgrade.show(err.code === 'rate_limited' ? 'rate' : 'chat')
    } else {
      setMessages((m) => [...m, { role: 'error', text: aiErrorMessage(err) }])
    }
  }

  async function send(text) {
    const question = (text ?? draft).trim()
    if (!question || busy) return
    setDraft('')
    // While checking a specific dish, a typed message names the next dish.
    if (dishMode) {
      askDish(question)
      return
    }
    // While planning dinner, a typed message refines the ideas.
    if (dinnerMode) {
      askDinner(question)
      return
    }
    setMessages((m) => [...m, { role: 'me', text: question }])
    setBusy(true)
    try {
      const res = await askChat(question, buildInventory())
      if (res?.kind === 'meals') {
        setMessages((m) => [...m, { role: 'meals', meals: res.meals }])
        setDinnerMode(true) // follow-ups now refine the ideas
        setRefined(false) // fresh dinner session → show the expiring-items picker first
        setPicked([])
      } else if (res?.kind === 'dish') {
        setMessages((m) => [...m, { role: 'dish', result: res.result }])
      } else if (res?.kind === 'list') {
        setMessages((m) => [...m, { role: 'list', list: { title: res.title, items: res.items } }])
      } else {
        setMessages((m) => [...m, { role: 'ai', text: res?.answer || '' }])
      }
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

  const togglePick = (name) =>
    setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]))

  // A fresh dinner session (from a suggestion chip or a typed question) — reset
  // the picker so the expiring-items chips show again before the refine chips.
  function startDinner(prompt) {
    setRefined(false)
    setPicked([])
    askDinner(prompt)
  }

  // Build the next batch of ideas around the items the user picked to use up.
  async function askDinnerWithItems(names) {
    if (busy || !names.length) return
    const label = names.join(', ')
    setMessages((m) => [...m, { role: 'me', text: `Use what's going off: ${label}` }])
    setDinnerMode(true)
    setRefined(true)
    setPicked([])
    setPicking(false)
    setBusy(true)
    try {
      const req = `Suggest meals that use up these items that are going off soon: ${label}. Prioritise using all of them together where possible.`
      const meals = await suggestMeals(buildInventory(), req)
      setMessages((m) => [...m, { role: 'meals', meals }])
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  // "Cook a specific dish": ask the user which dish, then (on their reply) check
  // what they have vs. still need.
  function startDish() {
    setDinnerMode(false)
    setDishMode(true)
    setMessages((m) => [
      ...m,
      { role: 'ai', dishPrompt: true, text: 'Sure — what do you want to make? Tell me the dish and I’ll check what you’ve got and what you still need.' }
    ])
  }

  async function askDish(dish) {
    if (busy) return
    const name = String(dish).trim()
    if (!name) return
    setMessages((m) => [...m, { role: 'me', text: name }])
    setDishMode(true)
    setBusy(true)
    try {
      const result = await checkDish(name, buildInventory())
      if (result) setMessages((m) => [...m, { role: 'dish', result }])
      else setMessages((m) => [...m, { role: 'error', text: 'Couldn’t work that one out — try another dish.' }])
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

  // Ask works with or without a fridge: with items it cooks from them, with an
  // empty fridge it answers from general knowledge (the free standalone mode).
  const noFridge = active.length === 0

  return (
    <div className="screen chat-screen">
      <header className="app-header" style={{ marginBottom: 8 }}>
        <div>
          <h1 className="app-title">Ask</h1>
          <p className="app-subtitle">
            {noFridge
              ? 'Ask for dinner ideas — no fridge needed.'
              : `${active.length} ${active.length === 1 ? 'item' : 'items'} in the fridge right now.`}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            className="btn-text"
            onClick={() => {
              chat.clear()
              setDinnerMode(false)
              setDishMode(false)
            }}
          >
            Clear chat
          </button>
        )}
      </header>

      {coachStep === 'cook' && (
        <CoachTip icon="🍳" title="Last one — stuck for dinner?" onDismiss={() => coach.next()}>
          Ask what you can make from what you've got. Tap a question below or type your own —
          I'll turn your fridge into real meal ideas.
        </CoachTip>
      )}

      <div className="chat">
        {urgent.length > 0 && !busy && !dinnerMode && !picking && (
          <button
            className="chat-nudge"
            onClick={() => {
              setPicked([])
              setPicking(true)
            }}
          >
            <IconWarning size={17} />
            <span>
              <strong>{urgent.length} {urgent.length === 1 ? 'item' : 'items'}</strong> to use up soon — pick what to cook with
            </span>
            <IconChevron size={16} />
          </button>
        )}

        {/* Pick which expiring items to cook with BEFORE the AI runs, so you can
            refine the request first rather than spending a credit blind. */}
        {picking && !busy && (
          <div className="suggest-row refine-row expiring-pick">
            <span className="expiring-pick-label">Going off soon — pick what you want to cook with:</span>
            <div className="expiring-chips">
              {urgentPick.map((it) => {
                const on = picked.includes(it.name)
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`exp-chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    onClick={() => togglePick(it.name)}
                  >
                    {on && <IconCheck size={12} />} {it.name}
                  </button>
                )
              })}
            </div>
            <div className="expiring-actions">
              <button className="exp-go" disabled={!picked.length} onClick={() => askDinnerWithItems(picked)}>
                {picked.length ? `Use ${picked.length} → get recipes` : 'Pick items, then get recipes'}
              </button>
              <button className="refine-exit" onClick={() => askDinnerWithItems(urgentPick.map((i) => i.name))}>
                Use them all
              </button>
              <button className="refine-exit" onClick={() => setPicking(false)}>
                <IconClose size={13} /> Cancel
              </button>
            </div>
          </div>
        )}

        <div className="chat-log" ref={logRef}>
          {messages.length === 0 && (
            <div className="empty" style={{ paddingTop: 32 }}>
              <div className="empty-art">
                <IconSparkle size={30} />
              </div>
              <h3>Ask me what to make</h3>
              <p>
                {noFridge
                  ? "Tell me what you fancy and I'll suggest real meals — dinner tonight, a quick lunch, breakfast, something healthy. Tap a question below or ask your own."
                  : "I'll turn what's in your fridge into real meal ideas — dinner tonight, a quick lunch, or using up what's about to go off. Tap a question below or ask your own."}
              </p>
              {showDietHint && (
                <button className="chat-diet-hint" onClick={onAccount}>
                  <IconSparkle size={15} />
                  <span>Vegetarian, gluten-free or allergic to something? Set your dietary needs so every idea fits.</span>
                  <IconChevron size={15} />
                </button>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={m.id ?? i}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className={m.role === 'meals' || m.role === 'dish' || m.role === 'list' ? 'meals-msg' : `bubble ${m.role}`}
                role={m.role === 'error' ? 'alert' : undefined}
              >
                {m.role === 'meals' ? (
                  <MealList meals={m.meals} />
                ) : m.role === 'dish' ? (
                  <DishCard res={m.result} />
                ) : m.role === 'list' ? (
                  <ListCard data={m.list} />
                ) : (
                  m.text
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {busy && (
            <div className="bubble ai" role="status" aria-label="Thinking…">
              <span className="typing">
                <span aria-hidden="true" />
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
        </div>

        {messages.length === 0 && !picking && (
          <div className="suggest-row">
            {SUGGESTIONS.filter((s) => !(noFridge && s.needsFridge)).map((s) => (
              <button key={s.label} onClick={() => (s.dish ? startDish() : startDinner(s.prompt || undefined))}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {dinnerMode && messages.length > 0 && !busy &&
          (!refined && urgentPick.length > 0 ? (
            // First round: tap the soonest-expiring items to cook with.
            <div className="suggest-row refine-row expiring-pick">
              <span className="expiring-pick-label">Going off soon — tap to cook with these:</span>
              <div className="expiring-chips">
                {urgentPick.map((it) => {
                  const on = picked.includes(it.name)
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={`exp-chip ${on ? 'on' : ''}`}
                      aria-pressed={on}
                      onClick={() => togglePick(it.name)}
                    >
                      {on && <IconCheck size={12} />} {it.name}
                    </button>
                  )
                })}
              </div>
              <div className="expiring-actions">
                <button className="exp-go" disabled={!picked.length} onClick={() => askDinnerWithItems(picked)}>
                  {picked.length ? `Use ${picked.length} → get recipes` : 'Pick items to use'}
                </button>
                <button className="refine-exit" onClick={() => setDinnerMode(false)}>
                  <IconClose size={13} /> Ask something else
                </button>
              </div>
            </div>
          ) : (
            // After refining: the usual refine chips.
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
          ))}

        {dishMode && messages.length > 0 && !busy && (
          <div className="suggest-row refine-row">
            <button className="refine-exit" onClick={() => setDishMode(false)}>
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
            placeholder={
              dishMode
                ? 'What do you want to make? (e.g. carbonara)'
                : dinnerMode
                  ? 'Refine the ideas… (e.g. vegetarian, quick)'
                  : 'Ask about your fridge…'
            }
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

// "I want to make X" result: what you've already got (with quantities) vs. what
// you still need (tappable straight onto the shopping list). Save it as a meal
// to keep it. Tolerates older history where have/need were plain strings.
function DishCard({ res }) {
  const have = (res?.have || []).map((h) => (typeof h === 'string' ? { name: h } : h)).filter((h) => h && h.name)
  const need = (res?.need || []).map((n) => (typeof n === 'string' ? { name: n } : n)).filter((n) => n && n.name)
  const dishName = res?.dish || ''
  const saved = useSyncExternalStore(
    savedMeals.subscribe,
    () => savedMeals.has(dishName),
    () => savedMeals.has(dishName)
  )
  if (!res) return null
  const save = () =>
    savedMeals.add({
      name: dishName,
      description: res.note || '',
      uses: have.map((h) => h.name),
      buy: need.map((n) => n.name)
    })

  return (
    <div className="meal-card dish-card">
      <div className="meal-head">
        <h4>{dishName}</h4>
        <button
          className={`meal-save ${saved ? 'on' : ''}`}
          onClick={save}
          disabled={saved}
          aria-pressed={saved}
        >
          {saved ? <IconCheck size={13} /> : <IconBookmark size={13} />}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {res.note && <p className="meal-desc">{res.note}</p>}
      {have.length > 0 && (
        <div className="dish-have">
          <p className="dish-have-label">You’ve got:</p>
          <ul className="dish-have-list">
            {have.map((h, i) => (
              <li key={i}>
                {h.name}
                {(h.have || h.needs) && (
                  <span className="dish-qty">
                    {' — '}
                    {h.have ? `have ${h.have}` : 'in stock'}
                    {h.needs ? `, needs ${h.needs}` : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {need.length > 0 ? (
        <>
          <p className="dish-need-label">You still need:</p>
          <MealBuy items={need} />
        </>
      ) : (
        <p className="dish-allset">✅ You’ve got everything you need!</p>
      )}
    </div>
  )
}

// A plain "things to add" list returned by the chat — rendered as a card with
// tappable add-to-shopping chips (+ "Add all"), so any list is actionable.
function ListCard({ data }) {
  const items = data?.items || []
  if (!items.length) return null
  return (
    <div className="meal-card dish-card">
      <div className="meal-head">
        <h4>{data.title || 'Add to your list'}</h4>
      </div>
      <MealBuy items={items} />
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
      <MealBuy items={meal.buy} />
    </div>
  )
}
