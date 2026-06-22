import { useRef, useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { detectFromImage, suggestMeals, aiErrorMessage } from '../lib/api.js'
import { downscaleImage } from '../lib/image.js'
import { upgrade } from '../lib/upgrade.js'
import { staplePrefs } from '../lib/staples.js'
import { hasDiet, DIET_OPTIONS, AVOID_OPTIONS } from '../lib/diet.js'
import { savedMeals } from '../lib/meals.js'
import { dinnerLast, useDinnerLast } from '../lib/dinnerLast.js'
import { toast } from '../lib/toast.js'
import * as firstrun from '../lib/firstrun.js'
import CoachTip from './CoachTip.jsx'
import MealBuy from './MealBuy.jsx'
import SavedMeals from './SavedMeals.jsx'
import { IconCamera, IconSparkle, IconChevron, IconClose, IconWarning, IconBookmark, IconCheck, IconUser } from '../icons.jsx'

// PROTOTYPE — the proposed new lead flow. Snap the food that's about to go off →
// straight to the meal engine (diet auto-applied via suggestMeals) → "here's
// dinner + the few things to buy". Reuses the existing AI + meal-card pieces;
// nothing here is wired into the main app yet (reached only via ?dinner).

const BASE_REQUEST =
  'I want to cook dinner tonight using these ingredients. Suggest a few dishes built around them — ' +
  "for each: a short description, which of my items it uses, and what I'd still need to buy. " +
  'Keep them realistic for a home cook.'

// Cuisine moods for the confirm screen. 'Any' leaves it open.
const CUISINES = ['Any', 'Italian', 'Asian', 'Indian', 'Mexican', 'Mediterranean', 'Comfort food', 'Healthy & light']

// A short, friendly summary of the user's diet for the reassurance chip.
function dietSummary() {
  const d = staplePrefs.getDiet()
  if (!hasDiet(d)) return null
  const diets = DIET_OPTIONS.filter((o) => d.diets?.[o.key]).map((o) => o.label)
  const avoid = AVOID_OPTIONS.filter((o) => d.avoid?.[o.key]).map((o) => o.label)
  const parts = [...diets]
  if (avoid.length) parts.push(`no ${avoid.join('/')}`)
  return parts.join(' · ') || null
}

export default function DinnerSnap({ userId, onExit, onAccount, onGoChat }) {
  const [phase, setPhase] = useState('idle') // idle | reading | pick | cooking | results | error
  const [preview, setPreview] = useState(null)
  const [items, setItems] = useState([])
  const [meals, setMeals] = useState([])
  const [error, setError] = useState(null)
  const [cuisine, setCuisine] = useState('Any')
  // First-use nudge on the Tonight screen — shown once per account until they
  // take their first photo (or dismiss it).
  const [showCoach, setShowCoach] = useState(() => !firstrun.seen('fridge.dinnercoach', userId))
  const [showSaved, setShowSaved] = useState(false)
  const last = useDinnerLast() // their last dinner result, remembered across tab switches
  const saved = useSyncExternalStore(savedMeals.subscribe, savedMeals.getAll, savedMeals.getAll)
  const fileRef = useRef(null)
  const diet = dietSummary()

  function dismissCoach() {
    firstrun.markSeen('fridge.dinnercoach', userId)
    setShowCoach(false)
  }
  // Re-open the last remembered dinner so it survives leaving the tab.
  function openLast() {
    if (!last) return
    setItems((last.items || []).map((name, i) => ({ name, _id: `${i}-${name}`, include: true })))
    setMeals(last.meals || [])
    setCuisine(last.cuisine || 'Any')
    setPhase('results')
  }

  // Build the meal request from the base ask + chosen cuisine + any refine tap.
  function buildRequest(extra) {
    let r = BASE_REQUEST
    if (cuisine && cuisine !== 'Any') r += `\n\nMake them ${cuisine} style.`
    if (extra) r += `\n\nExtra: ${extra}.`
    return r
  }

  async function handleFile(file) {
    if (!file) return
    dismissCoach() // they're off — the first-use nudge has done its job
    setError(null)
    setPhase('reading')
    try {
      const { dataUrl, mediaType, base64 } = await downscaleImage(file)
      setPreview(dataUrl)
      const { items: found } = await detectFromImage(base64, mediaType, 'groceries')
      setItems(found.map((it, i) => ({ ...it, _id: `${i}-${it.name}`, include: true })))
      setPhase('pick')
    } catch (err) {
      if (err.code === 'quota_exceeded' || err.code === 'rate_limited') {
        upgrade.show(err.code === 'rate_limited' ? 'rate' : 'scans')
        setPhase('idle')
      } else {
        setError(aiErrorMessage(err))
        setPhase('error')
      }
    }
  }

  async function getMeals(extra) {
    const chosen = items.filter((i) => i.include && i.name?.trim())
    if (!chosen.length) return
    const inventory = chosen.map((i) => ({
      name: i.name.trim(),
      category: i.category || 'other',
      quantity: i.quantity || 1,
      unit: i.unit || ''
    }))
    setPhase('cooking')
    setError(null)
    try {
      const result = await suggestMeals(inventory, buildRequest(extra))
      setMeals(result)
      setPhase('results')
      // Remember this result so it's still here when they come back to Tonight.
      dinnerLast.save({ items: chosen.map((i) => i.name.trim()), meals: result, cuisine })
    } catch (err) {
      if (err.code === 'quota_exceeded' || err.code === 'rate_limited') {
        upgrade.show(err.code === 'rate_limited' ? 'rate' : 'chat')
        setPhase('pick')
      } else {
        setError(aiErrorMessage(err))
        setPhase('error')
      }
    }
  }

  function reset() {
    setPhase('idle')
    setPreview(null)
    setItems([])
    setMeals([])
    setError(null)
  }
  function toggle(id) {
    setItems((list) => list.map((i) => (i._id === id ? { ...i, include: !i.include } : i)))
  }

  const chosenCount = items.filter((i) => i.include && i.name?.trim()).length

  return (
    <div className="screen">
      <header className="app-header">
        {onExit && (
          <button className="account-btn" onClick={onExit} aria-label="Back to the app">
            <IconChevron size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h1 className="app-title">What's for dinner?</h1>
          <p className="app-subtitle">
            {phase === 'results'
              ? 'Here’s what you could make tonight.'
              : phase === 'pick'
                ? 'Tweak it, then let’s cook.'
                : 'Snap what you fancy cooking with.'}
          </p>
        </div>
        {onAccount && (
          <button className="account-btn" onClick={onAccount} aria-label="Your account">
            <IconUser size={18} />
          </button>
        )}
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {phase === 'idle' && (
        <>
          <AnimatePresence>
            {showCoach && (
              <CoachTip icon="📸" title="Start here" onDismiss={dismissCoach}>
                Snap whatever you fancy cooking with — the veg, the meat, the bits in the fridge — and I’ll turn it
                into tonight’s dinner. Free, no setup.
              </CoachTip>
            )}
          </AnimatePresence>

          <div className="scan-drop">
            <div className="empty-art">
              <IconSparkle size={32} />
            </div>
            <h3 className="drop-h">What do you want to use tonight?</h3>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14, maxWidth: '34ch' }}>
              Snap whatever you fancy cooking with — the veg, the meat, the bits in the fridge — and I’ll turn it
              into dinner, plus the few things you still need.
            </p>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              <IconCamera size={19} /> Snap your ingredients
            </button>
          </div>

          {last && last.meals?.length > 0 && (
            <button className="dinner-last" onClick={openLast}>
              <div className="dinner-last-top">
                <span className="dinner-last-label">🍽️ Your last dinner</span>
                <span className="dinner-last-view">View →</span>
              </div>
              <span className="dinner-last-meals">{last.meals.map((m) => m.name).join(' · ')}</span>
            </button>
          )}

          {saved.length > 0 && (
            <button className="dinner-saved-link" onClick={() => setShowSaved(true)}>
              <IconBookmark size={16} />
              <span>Your saved meals ({saved.length})</span>
              <IconChevron size={16} />
            </button>
          )}
        </>
      )}

      {showSaved && (
        <SavedSheet
          onClose={() => setShowSaved(false)}
          onGoChat={() => {
            setShowSaved(false)
            onGoChat?.()
          }}
        />
      )}

      {(phase === 'reading' || phase === 'cooking') && (
        <div className="scan-preview">
          <img src={preview} alt="Your food, being read" />
          <div className="scan-busy">
            <Spinner /> {phase === 'reading' ? 'Reading your food…' : 'Thinking up dinners…'}
          </div>
        </div>
      )}

      {phase === 'pick' && (
        <>
          <p className="shop-hint" style={{ marginTop: 4 }}>
            <IconSparkle size={13} /> Tap to drop anything I misread, then cook.
          </p>
          {items.length === 0 ? (
            <p className="meals-empty">I couldn’t make out distinct items — try a brighter, closer photo.</p>
          ) : (
            <div className="expiring-chips" style={{ marginBottom: 16 }}>
              {items.map((it) => (
                <button
                  key={it._id}
                  type="button"
                  className={`exp-chip ${it.include ? 'on' : ''}`}
                  aria-pressed={it.include}
                  onClick={() => toggle(it._id)}
                >
                  {it.include && <IconCheck size={12} />} {it.name}
                </button>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="field" style={{ marginTop: 2 }}>
              <label>What are you in the mood for?</label>
              <div className="chips">
                {CUISINES.map((c) => (
                  <button key={c} type="button" className="chip" aria-pressed={cuisine === c} onClick={() => setCuisine(c)}>
                    {c}
                  </button>
                ))}
              </div>
              {diet ? (
                <p className="expiry-suggest" style={{ marginTop: 9 }}>
                  <IconCheck size={12} className="inline-ico" /> Ideas will fit your diet: {diet}.{' '}
                  {onAccount && (
                    <button type="button" onClick={onAccount}>
                      Change
                    </button>
                  )}
                </p>
              ) : onAccount ? (
                <button className="chat-diet-hint" style={{ marginTop: 10 }} onClick={onAccount}>
                  <IconSparkle size={15} />
                  <span>Vegetarian, gluten-free or allergic to something? Set your dietary needs so every idea fits.</span>
                  <IconChevron size={15} />
                </button>
              ) : null}
            </div>
          )}

          <div className="form-actions">
            <button className="btn btn-ghost" onClick={reset} aria-label="Start over">
              <IconClose size={18} />
            </button>
            <button className="btn btn-primary btn-block" disabled={chosenCount === 0} onClick={() => getMeals()}>
              {chosenCount ? `What can I make? (${chosenCount}) →` : 'Pick some items'}
            </button>
          </div>
        </>
      )}

      {phase === 'results' && (
        <>
          <div className="meals">
            {meals.length === 0 ? (
              <p className="meals-empty">Not quite enough to suggest a meal — snap a few more bits and try again.</p>
            ) : (
              <>
                <p className="meals-intro">From what you snapped, you could make:</p>
                {meals.map((m, i) => (
                  <ResultCard key={i} meal={m} />
                ))}
              </>
            )}
          </div>
          {meals.length > 0 && (
            <div className="suggest-row refine-row" style={{ marginTop: 4 }}>
              {['More adventurous', 'Quick & easy', 'Vegetarian', 'Use it all up'].map((r) => (
                <button key={r} onClick={() => getMeals(r)}>
                  {r}
                </button>
              ))}
            </div>
          )}
          <button className="btn btn-ghost btn-block" style={{ marginTop: 14 }} onClick={reset}>
            <IconCamera size={18} /> Snap something else
          </button>
        </>
      )}

      {phase === 'error' && (
        <>
          <div className="banner" role="alert" style={{ marginTop: 16 }}>
            <IconWarning size={18} />
            <span>{error}</span>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost btn-block" onClick={reset}>
              Try again
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ResultCard({ meal }) {
  const saved = useSyncExternalStore(
    savedMeals.subscribe,
    () => savedMeals.has(meal.name),
    () => savedMeals.has(meal.name)
  )
  // Saving is free — it's just local storage. The first time, explain where
  // saved meals live (the Tonight screen) so they know how to find them.
  function onSave() {
    const firstEver = savedMeals.getAll().length === 0
    const added = savedMeals.add(meal)
    if (!added) return
    toast.show(
      firstEver ? 'Saved 💚 Find your saved meals on the Tonight screen.' : 'Saved to your meals 💚',
      firstEver ? 3800 : 1800
    )
  }
  return (
    <div className="meal-card">
      <div className="meal-head">
        <h4>{meal.name}</h4>
        <button
          className={`meal-save ${saved ? 'on' : ''}`}
          onClick={onSave}
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

// Saved meals, reachable straight from Tonight (so they don't live only behind
// the Plus fridge). Reuses the same MealRow UI as the fridge's Meals tab.
function SavedSheet({ onClose, onGoChat }) {
  return (
    <div className="scrim" onClick={onClose}>
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Your saved meals"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2>Your saved meals</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>
        <SavedMeals onGoChat={onGoChat} />
      </motion.div>
    </div>
  )
}

function Spinner() {
  return (
    <motion.div
      style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.35)', borderTopColor: '#fff' }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: 'linear', duration: 0.9 }}
    />
  )
}
