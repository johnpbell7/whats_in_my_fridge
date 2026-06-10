import { useEffect } from 'react'
import { motion } from 'framer-motion'

// "Mark draws itself" intro: on a clean canvas the fridge outline draws on, inks
// solid, the leaf grows inside, then the wordmark settles in — and the whole
// thing fades to reveal the app. Tap to skip; respects prefers-reduced-motion.
export default function Splash({ onDone }) {
  let reduce = false
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    /* matchMedia unavailable — play the animation */
  }

  useEffect(() => {
    const t = setTimeout(onDone, reduce ? 250 : 2300)
    return () => clearTimeout(t)
  }, [onDone, reduce])

  const ease = [0.6, 0, 0.2, 1]
  // When reduced motion is on, everything is shown in its final state at once.
  const shown = reduce ? { opacity: 1 } : undefined

  return (
    <motion.div
      className="splash"
      onClick={onDone}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      <motion.div
        className="splash-mark"
        initial={reduce ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease }}
      >
        <svg viewBox="0 0 512 512" width="116" height="116" aria-hidden="true">
          <rect width="512" height="512" rx="116" fill="#2f7d5a" />

          {/* fridge outline drawing itself on */}
          {!reduce && (
            <motion.rect
              x="168" y="96" width="176" height="320" rx="40"
              fill="none" stroke="#ffffff" strokeWidth="10" strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ pathLength: { delay: 0.35, duration: 0.8, ease }, opacity: { delay: 0.35, duration: 0.2 } }}
            />
          )}
          {/* …then inks in solid */}
          <motion.rect
            x="168" y="96" width="176" height="320" rx="40" fill="#ffffff"
            initial={reduce ? false : { opacity: 0 }}
            animate={shown || { opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.35 }}
          />
          <motion.rect
            x="168" y="198" width="176" height="8" fill="#dfe7e1"
            initial={reduce ? false : { opacity: 0 }}
            animate={shown || { opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.3 }}
          />
          <motion.rect
            x="304" y="120" width="13" height="50" rx="6.5" fill="#cfe0d6"
            initial={reduce ? false : { opacity: 0 }}
            animate={shown || { opacity: 1 }}
            transition={{ delay: 1.28, duration: 0.3 }}
          />

          {/* leaf grows in */}
          <motion.path
            d="M256 250 C304 280 304 322 256 352 C208 322 208 280 256 250 Z"
            fill="#2f7d5a"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={reduce ? false : { opacity: 0, scale: 0 }}
            animate={shown || { opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.5, type: 'spring', stiffness: 240, damping: 16 }}
          />
          <motion.path
            d="M256 262 L256 344 M256 296 L282 282 M256 312 L232 298"
            stroke="#8fc7a8" strokeWidth="6" strokeLinecap="round" fill="none"
            initial={reduce ? false : { opacity: 0 }}
            animate={shown || { opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.3 }}
          />
        </svg>
      </motion.div>

      <motion.div
        className="splash-word"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 1.35, duration: 0.5, ease }}
      >
        <span className="splash-small">What's in my</span>
        <span className="splash-big">
          Fridge<svg className="leaf" viewBox="0 0 100 52" aria-hidden="true"><path d="M2 26 C 18 2, 64 2, 94 22 C 64 50, 18 50, 2 26 Z" fill="currentColor" /></svg>
        </span>
      </motion.div>
    </motion.div>
  )
}
