import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { IconFridge } from '../icons.jsx'

// A quick fridge-door open on launch. Two doors close the screen, the logo
// fades in, then the doors swing open to reveal the app behind. Tap to skip.
export default function Splash({ onDone }) {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const t = setTimeout(onDone, reduce ? 250 : 2400)
    return () => clearTimeout(t)
  }, [onDone, reduce])

  const doorTransition = { delay: 1.45, duration: 0.85, ease: [0.22, 1, 0.36, 1] }

  return (
    <motion.div
      className="splash"
      onClick={onDone}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="splash-door left"
        initial={{ rotateY: 0 }}
        animate={reduce ? { rotateY: 0 } : { rotateY: -120 }}
        transition={doorTransition}
      />
      <motion.div
        className="splash-door right"
        initial={{ rotateY: 0 }}
        animate={reduce ? { rotateY: 0 } : { rotateY: 120 }}
        transition={doorTransition}
      />

      <motion.div
        className="splash-logo"
        initial={{ opacity: 0, y: 14, scale: 0.9 }}
        animate={
          reduce
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: [0, 1, 1, 0], y: [14, 0, 0, -6], scale: [0.9, 1, 1, 1.02] }
        }
        transition={reduce ? { duration: 0.2 } : { duration: 1.55, times: [0, 0.32, 0.78, 1], ease: 'easeOut' }}
      >
        <span className="splash-mark">
          <IconFridge size={40} />
        </span>
        <span className="splash-word">
          <span className="splash-small">what's in my</span>
          <span className="splash-big">
            Fridge<i>.</i>
          </span>
        </span>
      </motion.div>
    </motion.div>
  )
}
