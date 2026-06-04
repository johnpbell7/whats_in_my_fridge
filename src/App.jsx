import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useItems } from './lib/useItems.js'
import { useShopping } from './lib/useShopping.js'
import { useAuth } from './lib/useAuth.js'
import { store, initStore } from './lib/store.js'
import { shopping, initShopping } from './lib/shopping.js'
import { staplePrefs, initStaplePrefs } from './lib/staples.js'
import InventoryScreen from './components/InventoryScreen.jsx'
import ScanScreen from './components/ScanScreen.jsx'
import ChatScreen from './components/ChatScreen.jsx'
import ShoppingScreen from './components/ShoppingScreen.jsx'
import ItemForm from './components/ItemForm.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import AccountSheet from './components/AccountSheet.jsx'
import Onboarding from './components/Onboarding.jsx'
import Toast from './components/Toast.jsx'
import UpgradeGate from './components/UpgradeGate.jsx'
import Nav from './components/Nav.jsx'
import Splash from './components/Splash.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { IconPlus } from './icons.jsx'

export default function App() {
  const items = useItems()
  const list = useShopping()
  const { enabled: authEnabled, loading: authLoading, session } = useAuth()
  const [tab, setTab] = useState('inventory')
  // null = closed; 'new' = blank add form; object = editing that item
  const [editing, setEditing] = useState(null)
  const [account, setAccount] = useState(false)
  const [booting, setBooting] = useState(true)
  // Intro walkthrough: shown on every open by default; "Don't show this again"
  // persists an opt-out under its own key.
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem('fridge.onboarding.hide') === '1'
    } catch {
      return false
    }
  })

  function finishOnboarding() {
    setOnboarded(true) // session only — shows again next time you open the app
  }
  function dontShowOnboarding() {
    try {
      localStorage.setItem('fridge.onboarding.hide', '1')
    } catch {
      /* private mode — it'll just keep showing */
    }
    setOnboarded(true)
  }

  // Load saved inventory + shopping list from durable storage on launch.
  useEffect(() => {
    initStore()
    initShopping()
    initStaplePrefs()
  }, [])

  // Keep on-device data tied to the signed-in account: if the account changes
  // (a different user, or sign-out), wipe the local fridge so one account never
  // sees another's on a shared device. We wait for the stores to finish loading
  // first so the load can't undo the wipe. (Proper per-account persistence
  // across devices comes with cloud sync.)
  useEffect(() => {
    if (!authEnabled || authLoading) return
    let cancelled = false
    ;(async () => {
      await Promise.all([initStore(), initShopping(), initStaplePrefs()])
      if (cancelled) return
      const uid = session?.user?.id || ''
      let last = null
      try {
        last = localStorage.getItem('fridge.lastUser')
      } catch {
        /* private mode */
      }
      if (last === null) {
        // First time we've tracked an account on this device — adopt whatever's
        // already here for this session rather than wiping it.
        try {
          localStorage.setItem('fridge.lastUser', uid)
        } catch {
          /* ignore */
        }
        return
      }
      if (uid !== last) {
        store.clear()
        shopping.clear()
        staplePrefs.clear()
        try {
          localStorage.setItem('fridge.lastUser', uid)
        } catch {
          /* ignore */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authEnabled, authLoading, session?.user?.id])

  function handleSave(values, id) {
    if (id) store.update(id, values)
    else store.add(values)
    setEditing(null)
  }

  // Walkthrough — shown before anything else each time you open the app.
  if (!onboarded) {
    return <Onboarding onDone={finishOnboarding} onNeverShow={dontShowOnboarding} />
  }

  // While the session is still resolving, hold a blank screen rather than
  // flashing the app to someone who may not be signed in.
  if (authEnabled && authLoading) {
    return <div className="app" />
  }

  // Account gate: when accounts are switched on and nobody is signed in, the
  // login screen stands in for the whole app. (Open mode skips this entirely.)
  if (authEnabled && !session) {
    return <AuthScreen />
  }

  return (
    <div className="app">
      {tab === 'inventory' && (
        <InventoryScreen
          items={items}
          onEdit={(item) => setEditing(item)}
          onAddManual={() => setEditing('new')}
          onGoScan={() => setTab('scan')}
          onAccount={authEnabled ? () => setAccount(true) : null}
        />
      )}
      {tab === 'scan' && (
        <ScanScreen
          onDone={() => setTab('inventory')}
          onAddManual={() => setEditing('new')}
        />
      )}
      {tab === 'chat' && (
        <ChatScreen
          items={items}
          onGoScan={() => setTab('scan')}
          onAddManual={() => setEditing('new')}
        />
      )}
      {tab === 'shopping' && <ShoppingScreen list={list} items={items} />}

      {tab === 'inventory' && (
        <button className="fab" onClick={() => setEditing('new')} aria-label="Add an item by hand">
          <IconPlus size={26} />
        </button>
      )}

      <Nav tab={tab} onChange={setTab} />

      <AnimatePresence>
        {editing && (
          <ItemForm
            item={editing === 'new' ? null : editing}
            onSave={handleSave}
            onDelete={(id) => {
              store.remove(id)
              setEditing(null)
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {account && <AccountSheet onClose={() => setAccount(false)} />}
      </AnimatePresence>

      <Toast />
      <UpgradeGate />

      <ErrorBoundary fallback={null}>
        <AnimatePresence>{booting && <Splash key="splash" onDone={() => setBooting(false)} />}</AnimatePresence>
      </ErrorBoundary>
    </div>
  )
}
