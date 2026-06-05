import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useItems } from './lib/useItems.js'
import { useShopping } from './lib/useShopping.js'
import { shopping } from './lib/shopping.js'
import { useAuth } from './lib/useAuth.js'
import { store, initStore } from './lib/store.js'
import { initShopping } from './lib/shopping.js'
import { initStaplePrefs } from './lib/staples.js'
import { startSync, stopSync } from './lib/cloud.js'
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
  // Pulse the Shopping tab when an item is added from elsewhere, so the user
  // knows where it went. We bump our own counter only for adds that happen
  // while another tab is showing (no point pulsing the tab you're looking at).
  const addCount = useSyncExternalStore(shopping.subscribeAdds, shopping.getAddCount, shopping.getAddCount)
  const tabRef = useRef(tab)
  tabRef.current = tab
  const prevAddCount = useRef(addCount)
  const [shoppingPulse, setShoppingPulse] = useState(0)
  useEffect(() => {
    if (addCount !== prevAddCount.current) {
      prevAddCount.current = addCount
      if (tabRef.current !== 'shopping') setShoppingPulse((n) => n + 1)
    }
  }, [addCount])
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

  // Persist completion so the walkthrough shows once (first open) and not on
  // every launch — re-showing a 5-slide intro each time is real friction.
  function finishOnboarding() {
    try {
      localStorage.setItem('fridge.onboarding.hide', '1')
    } catch {
      /* private mode — it'll just keep showing */
    }
    setOnboarded(true)
  }
  const dontShowOnboarding = finishOnboarding

  // Load saved inventory + shopping list from durable storage on launch.
  useEffect(() => {
    initStore()
    initShopping()
    initStaplePrefs()
  }, [])

  // Cloud sync: when signed in, pull this account's data from Supabase and
  // write changes through; on sign-out, clear the local copy. This is what
  // ties data to the account (and keeps it off another account on the device).
  useEffect(() => {
    if (!authEnabled || authLoading) return
    if (session?.user) startSync(session.user)
    else stopSync()
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
          onGoChat={() => setTab('chat')}
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

      <Nav tab={tab} onChange={setTab} pulseTab="shopping" pulseAt={shoppingPulse} />

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
