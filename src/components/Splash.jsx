import { useEffect } from 'react'
import { motion } from 'framer-motion'

// Clean fridge-open intro: the logo settles on the closed steel doors, then
// the two doors glide apart to reveal the app. Tap to skip; respects
// prefers-reduced-motion.
export default function Splash({ onDone }) {
  let reduce = false
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    /* matchMedia unavailable — play the animation */
  }

  useEffect(() => {
    const t = setTimeout(onDone, reduce ? 250 : 2200)
    return () => clearTimeout(t)
  }, [onDone, reduce])

  const slide = { delay: 1.25, duration: 0.7, ease: [0.6, 0, 0.2, 1] }

  return (
    <motion.div
      className="splash"
      onClick={onDone}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="splash-door left"
        initial={{ x: 0 }}
        animate={reduce ? { x: 0 } : { x: '-101%' }}
        transition={slide}
      />
      <motion.div
        className="splash-door right"
        initial={{ x: 0 }}
        animate={reduce ? { x: 0 } : { x: '101%' }}
        transition={slide}
      />

      <motion.div
        className="splash-logo"
        initial={{ opacity: 0, y: 16 }}
        animate={reduce ? { opacity: 1, y: 0 } : { opacity: [0, 1, 1, 0], y: [16, 0, 0, 0] }}
        transition={
          reduce ? { duration: 0.2 } : { duration: 1.25, times: [0, 0.28, 0.74, 0.94], ease: 'easeOut' }
        }
      >
        <img className="splash-icon" src="/icon.svg" alt="" width="88" height="88" />
        <span className="splash-word">
          <span className="splash-small">What's in my</span>
          <span className="splash-big">
            Fridge<i>.</i>
          </span>
        </span>
      </motion.div>
    </motion.div>
  )
}
