import { useRef, useState, useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { detectFromImage, suggestMeals, aiErrorMessage } from '../lib/api.js'
import { downscaleImage } from '../lib/image.js'
import { upgrade } from '../lib/upgrade.js'
import { staplePrefs } from '../lib/staples.js'
import { hasDiet, DIET_OPTIONS, AVOID_OPTIONS } from '../lib/diet.js'
import { savedMeals } from '../lib/meals.js'
import { useIsPlus } from '../lib/me.js'
import MealBuy from './MealBuy.jsx'
import { IconCamera, IconSparkle, IconChevron, IconClock, IconClose, IconWarning, IconBookmark, IconCheck, IconUser } from '../icons.jsx'

// PROTOTYPE — the proposed new lead flow. Snap the food that's about to go off →
// straight to the meal engine (diet auto-applied via suggestMeals) → "here's
// dinner + the few things to buy". Reuses the existing AI + meal-card pieces;
// nothing here is wired into the main app yet (reached only via ?dinner).

const BASE_REQUEST =
  'Suggest a few dinners I can make mainly from these ingredients — they need using up. ' +
  "For each dish: a short description, which of my items it uses, and what I'd still need " +
  'to buy. Keep them realistic for a home cook.'

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

export default function DinnerSnap({ onExit, onAccount }) {
  const [phase, setPhase] = useState('idle') // idle | reading | pick | cooking | results | error
  const [preview, setPreview] = useState(null)
  const [items, setItems] = useState([])
  const [meals, setMeals] = useState([])
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const diet = dietSummary()

  async function handleFile(file) {
    if (!file) return
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
      unit: i.unit || '',
      // Flag everything as "use soon" so the meal engine prioritises using it up.
      expiry: 'soon',
      keeps: 'fresh'
    }))
    setPhase('cooking')
    setError(null)
    try {
      const request = extra ? `${BASE_REQUEST}\n\nExtra: ${extra}.` : BASE_REQUEST
      const result = await suggestMeals(inventory, request)
      setMeals(result)
      setPhase('results')
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
                ? 'Check what I spotted, then cook.'
                : 'Snap what’s going off — I’ll do the thinking.'}
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
        <div className="scan-drop">
          <div className="empty-art">
            <IconClock size={32} />
          </div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19 }}>What needs using up?</h3>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14, maxWidth: '34ch' }}>
            Snap the food that’s about to go off — the veg, the meat, the leftovers — and I’ll tell you what
            to cook tonight and the few things you still need.
          </p>
          {diet ? (
            <span className="suggest-chip" style={{ pointerEvents: 'none' }}>
              <IconCheck size={13} /> Ideas will fit: {diet}
            </span>
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Tip: set dietary needs in your account for tailored ideas.
            </span>
          )}
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            <IconCamera size={19} /> Snap what’s going off
          </button>
        </div>
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
  const isPlus = useIsPlus()
  const saved = useSyncExternalStore(
    savedMeals.subscribe,
    () => savedMeals.has(meal.name),
    () => savedMeals.has(meal.name)
  )
  const onSave = () => (isPlus ? savedMeals.add(meal) : upgrade.show('list'))
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

function Spinner() {
  return (
    <motion.div
      style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.35)', borderTopColor: '#fff' }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: 'linear', duration: 0.9 }}
    />
  )
}
