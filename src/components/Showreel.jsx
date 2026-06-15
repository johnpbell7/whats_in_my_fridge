import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KnowVisual, AddVisual, FreshVisual, StaplesVisual, ShopVisual } from './Onboarding.jsx'
import { IconSparkle, IconCheck } from '../icons.jsx'

// A self-playing, looping reel of every USP, using the app's own on-brand
// animations. Open at /?showreel and screen-record it — full-screen, no app
// chrome, no sign-in. Normal users never see it (gated on the query flag in App).

const DURATION = 2.8 // seconds per slide

function MealsVisual() {
  return (
    <div className="ob-card ob-staple">
      <div className="ob-staple-head"><IconSparkle size={15} /> Tonight you could make…</div>
      <div className="ob-line"><span className="ob-line-name">Veg &amp; egg shakshuka</span></div>
      <div className="ob-line"><span className="ob-line-name">Creamy garlic pasta</span></div>
    </div>
  )
}

function DietVisual() {
  return (
    <div className="ob-card ob-add">
      <span className="ob-pill ob-pill-accent"><IconCheck size={13} /> Vegetarian</span>
      <span className="ob-pill ob-pill-accent"><IconCheck size={13} /> Gluten-free</span>
      <span className="ob-pill">No nuts</span>
    </div>
  )
}

const SLIDES = [
  { key: 'scan', title: 'A photo does the typing', sub: 'Snap your shopping or a receipt', Visual: AddVisual },
  { key: 'know', title: 'Know what’s in your fridge', sub: 'Fridge, freezer & pantry — always up to date', Visual: KnowVisual },
  { key: 'fresh', title: 'Use it before you lose it', sub: 'Use-by nudges, so good food isn’t binned', Visual: FreshVisual },
  { key: 'staples', title: 'Never run out of essentials', sub: 'Flagged the moment you run low', Visual: StaplesVisual },
  { key: 'shop', title: 'Shop it, then restock it', sub: 'A list that files itself back into your fridge', Visual: ShopVisual },
  { key: 'meals', title: 'Dinner from what you’ve got', sub: 'Real meal ideas from your own fridge', Visual: MealsVisual },
  { key: 'diet', title: 'Cooks for your diet', sub: 'Vegan, gluten-free, allergies — all respected', Visual: DietVisual }
]

export default function Showreel() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), DURATION * 1000)
    return () => clearTimeout(t)
  }, [i])

  const slide = SLIDES[i]
  const Visual = slide.Visual

  return (
    <div className="reel">
      <div className="reel-top">
        <span className="reel-brand">
          What’s in my Fridge<span className="reel-leaf">.</span>
        </span>
        <div className="reel-progress">
          {SLIDES.map((s, idx) => (
            <span key={s.key} className="reel-seg">
              {idx < i && <i className="reel-fill done" />}
              {idx === i && (
                <motion.i
                  className="reel-fill"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: DURATION, ease: 'linear' }}
                />
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="reel-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.key}
            className="reel-slide"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="reel-title">{slide.title}</h1>
            <p className="reel-sub">{slide.sub}</p>
            <div className="reel-visual"><Visual /></div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="reel-foot">whatsinmyfridge.co.uk</div>
    </div>
  )
}
