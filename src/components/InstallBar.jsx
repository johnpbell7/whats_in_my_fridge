import { useEffect, useState } from 'react'
import { isMobile, isStandalone, canPrompt, promptInstall, subscribe } from '../lib/install.js'
import { track } from '../lib/analytics.js'
import { IconHome, IconClose } from '../icons.jsx'

const HIDE = 'fridge.installbar.hide' // per visit: comes back next time they open it

function hiddenThisVisit() {
  try {
    return sessionStorage.getItem(HIDE) === '1'
  } catch {
    return false
  }
}

// A slim bar at the top of the app whenever it's open in a browser tab rather
// than from the home screen. People who use it from the home screen keep
// using it; people in a tab forget it. On a phone it opens the step-by-step
// guide (or Android's own Install); on a computer, the QR code for the phone.
export default function InstallBar({ onGuide, onPhone }) {
  const [hidden, setHidden] = useState(hiddenThisVisit)
  const [, rerender] = useState(0)
  useEffect(() => subscribe(() => rerender((n) => n + 1)), []) // Android's install event can arrive late

  if (hidden || isStandalone()) return null
  const mobile = isMobile()

  async function act() {
    track('install_bar', { device: mobile ? 'phone' : 'computer' })
    if (!mobile) return onPhone()
    if (canPrompt()) {
      const outcome = await promptInstall()
      if (outcome !== 'unavailable') return
    }
    onGuide()
  }

  function close() {
    try {
      sessionStorage.setItem(HIDE, '1')
    } catch {
      /* private mode: it just hides for now */
    }
    setHidden(true)
  }

  return (
    <div className="install-bar" role="region" aria-label="Add to home screen">
      <IconHome size={18} />
      <span className="install-bar-t">
        {mobile ? 'Add it to your home screen so it opens like an app.' : 'Use it on your phone, where your fridge is.'}
      </span>
      <button type="button" className="install-bar-btn" onClick={act}>
        {mobile ? (canPrompt() ? 'Install' : 'Show me') : 'Show code'}
      </button>
      <button type="button" className="install-bar-x" onClick={close} aria-label="Hide for now">
        <IconClose size={16} />
      </button>
    </div>
  )
}
