import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useItems } from './lib/useItems.js'
import { store, initStore } from './lib/store.js'
import InventoryScreen from './components/InventoryScreen.jsx'
import ScanScreen from './components/ScanScreen.jsx'
import ChatScreen from './components/ChatScreen.jsx'
import ItemForm from './components/ItemForm.jsx'
import Nav from './components/Nav.jsx'
import Splash from './components/Splash.jsx'
import { IconPlus } from './icons.jsx'

export default function App() {
  const items = useItems()
  const [tab, setTab] = useState('inventory')
  // null = closed; 'new' = blank add form; object = editing that item
  const [editing, setEditing] = useState(null)
  const [booting, setBooting] = useState(true)

  // Load the saved inventory from durable storage on launch.
  useEffect(() => {
    initStore()
  }, [])

  function handleSave(values, id) {
    if (id) store.update(id, values)
    else store.add(values)
    setEditing(null)
  }

  return (
    <div className="app">
      {tab === 'inventory' && (
        <InventoryScreen
          items={items}
          onEdit={(item) => setEditing(item)}
          onAddManual={() => setEditing('new')}
          onGoScan={() => setTab('scan')}
        />
      )}
      {tab === 'scan' && (
        <ScanScreen
          onDone={() => setTab('inventory')}
          onAddManual={() => setEditing('new')}
        />
      )}
      {tab === 'chat' && <ChatScreen items={items} />}

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

      <AnimatePresence>{booting && <Splash key="splash" onDone={() => setBooting(false)} />}</AnimatePresence>
    </div>
  )
}
