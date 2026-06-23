import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import MethodSheet from './MethodSheet.jsx'
import { IconBowl } from '../icons.jsx'

// "How to" button shown next to Save on every meal card. Opens the step-by-step
// walkthrough sheet (a Plus feature; free users see an upsell inside it). When a
// Plus user generates the recipe, `onMethod` hands it back so the card can pull
// it through on save. `servings` seeds the recipe scale from the chosen count.
export default function HowToButton({ meal, servings, onMethod, label = 'How to' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="meal-howto" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <IconBowl size={13} /> {label}
      </button>
      <AnimatePresence>
        {open && (
          <MethodSheet
            meal={meal}
            servings={servings}
            onMethod={onMethod}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
