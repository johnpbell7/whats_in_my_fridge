import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getMethod, aiErrorMessage } from '../lib/api.js'
import { savedMeals } from '../lib/meals.js'
import SafetyNote from './SafetyNote.jsx'
import { useIsPlus } from '../lib/me.js'
import { upgrade } from '../lib/upgrade.js'
import { useSheet } from '../lib/useSheet.js'
import { IconClose, IconSparkle, IconCheck, IconWarning } from '../icons.jsx'

// Step-by-step cooking walkthrough — a Plus feature. Opened from the "How to"
// button on any meal card. The number of people is ALWAYS chosen before the AI
// runs (and the recipe only regenerates on an explicit tap), so a credit is
// spent once, on the right portion size — never on stepper fiddling.
//   • Plus/trial, no recipe yet: pick servings → "Show me the recipe" (one call).
//   • Plus/trial, saved recipe: shows instantly; changing servings offers a
//     one-tap regenerate.
//   • Free: the recipe is locked behind an upsell (the meal idea stays free).
// A generated method is attached to the saved meal so it persists and locks
// correctly later.
export default function MethodSheet({ meal, servings = 2, onClose, onMethod }) {
  const isPlus = useIsPlus()
  const sheetRef = useSheet(onClose)
  // Reuse a walkthrough we already hold for this dish — the meal's own method,
  // or one generated before for the same name (saved or not). Stops a second
  // credit being spent on a recipe you've already been given.
  const ownMethod = meal?.method && meal.method.steps?.length ? meal.method : null
  const savedMethod = ownMethod || savedMeals.methodFor(meal?.name)
  const [serves, setServes] = useState(savedMethod?.serves || servings || 2)
  const [method, setMethod] = useState(savedMethod)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Avoid double-fetching in React's strict-mode double-mount.
  const fetchedFor = useRef(savedMethod ? serves : null)

  async function load(forServes) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const m = await getMethod({ name: meal.name, uses: meal.uses, buy: meal.buy, servings: forServes })
      if (!m) throw new Error('Could not write that recipe.')
      setMethod(m)
      fetchedFor.current = forServes
      // Persist onto the saved meal so it survives and locks correctly later.
      if (meal.id) savedMeals.setMethod(meal.id, m)
      // Always cache by name too, so re-opening this dish's how-to (even if it
      // wasn't saved, or was saved before now) reuses it — no second credit.
      savedMeals.rememberMethod(meal.name, m)
      // Let the card capture it, so saving the meal pulls the walkthrough through.
      onMethod?.(m)
    } catch (err) {
      if (err.code === 'plus_required') {
        upgrade.show('method')
        onClose?.()
        return
      }
      if (err.code === 'quota_exceeded' || err.code === 'rate_limited') {
        upgrade.show(err.code === 'rate_limited' ? 'rate' : 'chat')
        onClose?.()
        return
      }
      setError(aiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // Pick servings only — no AI call. Generating is always an explicit tap.
  const setServesOnly = (next) => setServes(Math.min(12, Math.max(1, next)))

  const locked = !isPlus
  // Has the servings been changed since the shown recipe was generated?
  const staleServes = method && method.serves !== serves

  return (
    <div className="scrim" onClick={onClose}>
      <motion.div
        className="sheet method-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`How to make ${meal?.name || 'this dish'}`}
        tabIndex={-1}
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2>{meal?.name}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        {/* FREE — the walkthrough is locked. Show the meal idea but gate the steps. */}
        {locked ? (
          <div className="method-locked">
            <div className="method-lock-art">
              <IconSparkle size={26} />
            </div>
            <h3>Step-by-step is a Plus feature</h3>
            <p>
              {savedMethod
                ? 'You saved this recipe’s full walkthrough on your trial. Re-join Plus to open the step-by-step method again — your saved meals and shopping ideas stay free.'
                : 'Plus turns any idea into a full step-by-step recipe — scaled to how many you’re cooking for, with exact quantities. Your meal ideas and lists stay free.'}
            </p>
            <button className="btn btn-primary btn-block" onClick={() => { upgrade.show('method'); onClose?.() }}>
              <IconSparkle size={17} /> Unlock walkthroughs with Plus
            </button>
          </div>
        ) : (
          <div className="method-body">
            <div className="method-serves">
              <span>Cooking for</span>
              <div className="serves-stepper">
                <button type="button" onClick={() => setServesOnly(serves - 1)} disabled={busy || serves <= 1} aria-label="Fewer people">−</button>
                <strong>{serves}</strong>
                <button type="button" onClick={() => setServesOnly(serves + 1)} disabled={busy || serves >= 12} aria-label="More people">+</button>
              </div>
              <span className="method-serves-unit">{serves === 1 ? 'person' : 'people'}</span>
            </div>

            {/* No recipe yet → confirm the portion, THEN spend one credit. */}
            {!method && !busy && !error && (
              <button className="btn btn-primary btn-block" onClick={() => load(serves)}>
                <IconSparkle size={17} /> Show me the recipe for {serves}
              </button>
            )}

            {/* Recipe already shown but the count was changed → one-tap regenerate. */}
            {method && staleServes && !busy && (
              <button className="btn btn-primary btn-block" onClick={() => load(serves)}>
                <IconSparkle size={17} /> Update recipe for {serves} {serves === 1 ? 'person' : 'people'}
              </button>
            )}

            {busy && (
              <div className="method-loading" role="status">
                <span className="typing"><span /><span /><span /><span /></span>
                Writing your recipe for {serves}…
              </div>
            )}

            {error && !busy && (
              <div className="banner" role="alert" style={{ marginTop: 8 }}>
                <IconWarning size={18} />
                <span>{error}</span>
                <button className="btn-text" onClick={() => load(serves)}>Retry</button>
              </div>
            )}

            {method && !busy && (
              <>
                {method.time && <p className="method-time">⏱ {method.time} · serves {method.serves}</p>}
                {method.caloriesPerServing > 0 && (
                  <p className="method-calories">
                    ~{method.caloriesPerServing} kcal per serving
                    <span className="method-calories-est"> · estimate</span>
                  </p>
                )}
                {method.ingredients?.length > 0 && (
                  <div className="method-section">
                    <h4>Ingredients</h4>
                    <ul className="method-ingredients">
                      {method.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                    </ul>
                  </div>
                )}
                {method.steps?.length > 0 && (
                  <div className="method-section">
                    <h4>Method</h4>
                    <ol className="method-steps">
                      {method.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                )}
                {method.tip && (
                  <p className="method-tip">
                    <IconCheck size={13} className="inline-ico" /> {method.tip}
                  </p>
                )}
                <SafetyNote calories={method.caloriesPerServing > 0} />
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
