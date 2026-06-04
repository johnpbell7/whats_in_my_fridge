import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useItems } from './lib/useItems.js'
import { useShopping } from './lib/useShopping.js'
import { useAuth } from './lib/useAuth.js'
import { store, initStore } from './lib/store.js'
import { initShopping } from './lib/shopping.js'
import { initStaplePrefs } from './lib/staples.js'
import InventoryScreen from './components/InventoryScreen.jsx'
import ScanScreen from './components/ScanScreen.jsx'
import ChatScreen from './components/ChatScreen.jsx'
import ShoppingScreen from './components/ShoppingScreen.jsx'
import ItemForm from './components/ItemForm.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import AccountSheet from './components/AccountSheet.jsx'
import Onboarding from './components/Onboarding.jsx'
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
  // First-run intro: shown once per device until completed/skipped.
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem('fridge.onboarded.v1') === '1'
    } catch {
      return false
    }
  })

  function finishOnboarding() {
    try {
      localStorage.setItem('fridge.onboarded.v1', '1')
    } catch {
      /* private mode — it'll just show again next time */
    }
    setOnboarded(true)
  }

  // Load saved inventory + shopping list from durable storage on launch.
  useEffect(() => {
    initStore()
    initShopping()
    initStaplePrefs()
  }, [])

  function handleSave(values, id) {
    if (id) store.update(id, values)
    else store.add(values)
    setEditing(null)
  }

  // First-run pitch — show before anything else so new visitors see what the
  // app does (and why to sign up) the very first time.
  if (!onboarded) {
    return <Onboarding onDone={finishOnboarding} />
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
      {tab === 'chat' && <ChatScreen items={items} />}
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

      <ErrorBoundary fallback={null}>
        <AnimatePresence>{booting && <Splash key="splash" onDone={() => setBooting(false)} />}</AnimatePresence>
      </ErrorBoundary>
    </div>
  )
}
