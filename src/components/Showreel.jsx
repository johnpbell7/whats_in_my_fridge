import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KnowVisual, AddVisual, FreshVisual, StaplesVisual, ShopVisual } from './Onboarding.jsx'
import { IconSparkle, IconCheck } from '../icons.jsx'

// A self-playing, looping reel of every USP — a phone mockup showing the app
// screen, with the headline underneath (like the website). Open at /?showreel
// and screen-record it. Full-screen, no app chrome, no sign-in. Gated on the
// query flag in App, so normal users never see it.

const DURATION = 3 // seconds per slide

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

// One app "screen" inside the phone: a little header bar, the USP mock-up, and
// an optional green call-to-action button (like the real app screens).
function Screen({ tab, cta, children }) {
  return (
    <div className="reel-screen">
      <div className="reel-screen-head">
        <span className="reel-screen-brand">Fridge<span className="reel-leaf">.</span></span>
        <span className="reel-screen-tab">{tab}</span>
      </div>
      <div className="reel-screen-body">{children}</div>
      {cta && <div className="reel-cta">{cta}</div>}
    </div>
  )
}

const SLIDES = [
  { key: 'scan', title: 'A photo does the typing', sub: 'Snap your shopping or a receipt', tab: 'Add food', cta: 'Scan shopping', Visual: AddVisual },
  { key: 'know', title: 'Know what’s in your fridge', sub: 'Fridge, freezer & pantry — always up to date', tab: 'In stock', Visual: KnowVisual },
  { key: 'fresh', title: 'Use it before you lose it', sub: 'Use-by nudges, so good food isn’t binned', tab: 'Use soon', Visual: FreshVisual },
  { key: 'staples', title: 'Never run out of essentials', sub: 'Flagged the moment you run low', tab: 'Essentials', Visual: StaplesVisual },
  { key: 'shop', title: 'Shop it, then restock it', sub: 'A list that files itself back into your fridge', tab: 'My list', Visual: ShopVisual },
  { key: 'meals', title: 'Dinner from what you’ve got', sub: 'Real meal ideas from your own fridge', tab: 'Dinner ideas', cta: 'View recipe', Visual: MealsVisual },
  { key: 'diet', title: 'Cooks for your diet', sub: 'Vegan, gluten-free, allergies — all respected', tab: 'Preferences', cta: 'Save preferences', Visual: DietVisual }
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
            <div className="reel-phone">
              <Screen tab={slide.tab} cta={slide.cta}>
                <Visual />
              </Screen>
            </div>
            <h1 className="reel-title">{slide.title}</h1>
            <p className="reel-sub">{slide.sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="reel-foot">whatsinmyfridge.co.uk</div>
    </div>
  )
}
