import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { tryScan, aiErrorMessage } from '../lib/api.js'
import { downscaleImage } from '../lib/image.js'
import { CATEGORIES } from '../lib/categories.js'
import { savePending } from '../lib/tryFirst.js'
import { track } from '../lib/analytics.js'
import { IconCamera, IconFridge, IconWarning } from '../icons.jsx'

const label = (key) => CATEGORIES.find((c) => c.key === key)?.label || 'Other'

// What a first-time visitor sees instead of "Welcome back": snap your own
// fridge, see the list, then make an account to keep it. Tips come first so
// the one free try gives a good result.
export default function TryFirst({ onSave, onSignIn, onSignUp }) {
  const [phase, setPhase] = useState('intro') // intro -> reading -> result | error
  const [preview, setPreview] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)
  const [used, setUsed] = useState(false) // the server said no more tries today
  const cameraRef = useRef(null)
  const libraryRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    setError(null)
    setPhase('reading')
    try {
      const { dataUrl, mediaType, base64 } = await downscaleImage(file)
      setPreview(dataUrl)
      const found = await tryScan(base64, mediaType)
      setItems(found)
      track('try_scan', { found: found.length })
      setPhase(found.length ? 'result' : 'error')
      if (!found.length) setError('We couldn’t spot any food in that one. Try again with the door wide open and the light on.')
    } catch (err) {
      if (err.code === 'try_used' || err.code === 'try_off') setUsed(true)
      setError(aiErrorMessage(err))
      setPhase('error')
    }
  }

  function save() {
    savePending(items)
    track('try_save', { found: items.length })
    onSave(items.length)
  }

  const pick = (ref) => () => ref.current?.click()
  const onPick = (e) => {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  return (
    <div className="auth">
      <motion.div
        className="auth-card try-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
        <input ref={libraryRef} type="file" accept="image/*" hidden onChange={onPick} />

        {phase === 'intro' && (
          <>
            <div className="auth-brand">
              <IconFridge size={26} />
            </div>
            <h1>See it work on your own fridge</h1>
            <p>Snap a photo and we’ll list what’s in it in a few seconds. No account needed to try.</p>

            <div className="try-tips" role="note">
              <p className="try-tips-h">For the best result</p>
              <ul>
                <li>Open the door wide and step back, so every shelf is in the photo.</li>
                <li>Turn the kitchen light on. Hold the phone straight, not at an angle.</li>
                <li>Turn labels to face you where you can.</li>
                <li>Just been shopping? Lay it out on the worktop and snap that instead. It reads best of all.</li>
              </ul>
            </div>

            <button className="btn btn-primary btn-block" onClick={pick(cameraRef)}>
              <IconCamera size={19} /> Snap your fridge
            </button>
            <button className="btn-text auth-switch" onClick={pick(libraryRef)}>
              Or choose a photo you’ve taken
            </button>

            <div className="try-divider" />
            <button className="btn btn-ghost btn-block" onClick={onSignUp}>
              Create an account
            </button>
            <button className="btn-text auth-switch" onClick={onSignIn}>
              Already have an account? Sign in
            </button>
          </>
        )}

        {(phase === 'reading' || phase === 'error') && preview && (
          <div className="scan-preview try-preview">
            <img src={preview} alt="Your photo, being read for food" />
            {phase === 'reading' && (
              <div className="scan-busy">
                <motion.div
                  className="try-spin"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, ease: 'linear', duration: 0.9 }}
                />
                Reading your fridge…
              </div>
            )}
          </div>
        )}
        {phase === 'reading' && !preview && <p className="try-wait">Getting your photo ready…</p>}

        {phase === 'error' && (
          <>
            <div className="auth-error try-error" role="alert">
              <IconWarning size={16} /> <span>{error}</span>
            </div>
            {used ? (
              <button className="btn btn-primary btn-block" onClick={onSignUp}>
                Create a free account
              </button>
            ) : (
              <button className="btn btn-primary btn-block" onClick={() => setPhase('intro')}>
                Try another photo
              </button>
            )}
            <button className="btn-text auth-switch" onClick={onSignIn}>
              Already have an account? Sign in
            </button>
          </>
        )}

        {phase === 'result' && (
          <>
            <h1>We found {items.length} {items.length === 1 ? 'thing' : 'things'}</h1>
            <p>Here’s what’s in your photo. Make a free account and it all goes straight into your fridge, with a nudge before anything goes off.</p>
            <ul className="try-list">
              {items.map((it, i) => (
                <li key={`${i}-${it.name}`}>
                  <span className="try-name">
                    {it.quantity > 1 && <b>{it.quantity} × </b>}
                    {it.name}
                  </span>
                  <span className="try-cat">{label(it.category)}</span>
                </li>
              ))}
            </ul>
            <button className="btn btn-primary btn-block" onClick={save}>
              Save to my fridge
            </button>
            <button className="btn-text auth-switch" onClick={() => setPhase('intro')}>
              Try a different photo
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
