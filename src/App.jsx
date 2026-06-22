import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useItems } from './lib/useItems.js'
import { useShopping } from './lib/useShopping.js'
import { shopping } from './lib/shopping.js'
import { useAuth } from './lib/useAuth.js'
import { store, initStore } from './lib/store.js'
import { coach, useCoachStep } from './lib/coach.js'
import { me, useIsPlus, useMe } from './lib/me.js'
import { initShopping } from './lib/shopping.js'
import { initStaplePrefs } from './lib/staples.js'
import { startSync, stopSync } from './lib/cloud.js'
import { confirmCheckout, getMe } from './lib/api.js'
import { upgrade } from './lib/upgrade.js'
import { track } from './lib/analytics.js'
import { toast } from './lib/toast.js'
import InventoryScreen from './components/InventoryScreen.jsx'
import ScanScreen from './components/ScanScreen.jsx'
import ChatScreen from './components/ChatScreen.jsx'
import ShoppingScreen from './components/ShoppingScreen.jsx'
import ItemForm from './components/ItemForm.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import AccountSheet from './components/AccountSheet.jsx'
import Onboarding from './components/Onboarding.jsx'
import InstallGuide from './components/InstallGuide.jsx'
import HelpSheet from './components/HelpSheet.jsx'
import ReportSheet from './components/ReportSheet.jsx'
import { isMobile, isStandalone } from './lib/install.js'
import { hasUnseen, markSeen } from './lib/whatsnew.js'
import Toast from './components/Toast.jsx'
import UpgradeGate from './components/UpgradeGate.jsx'
import Showreel from './components/Showreel.jsx'
import DinnerSnap from './components/DinnerSnap.jsx'
import LockedFeature from './components/LockedFeature.jsx'
import Nav from './components/Nav.jsx'
import Splash from './components/Splash.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { IconPlus } from './icons.jsx'
import * as firstrun from './lib/firstrun.js'
import { dinnerLast } from './lib/dinnerLast.js'

export default function App() {
  const items = useItems()
  const list = useShopping()
  const { enabled: authEnabled, loading: authLoading, session } = useAuth()
  // Who first-run guidance is keyed to: the signed-in account (so a brand-new
  // account gets the walkthrough/prompts again, even on a browser that's seen
  // them), or 'local' in open mode.
  const userId = authEnabled ? session?.user?.id || null : 'local'
  // "Tonight" (the photo → dinner lead) is the front door now.
  const [tab, setTab] = useState('dinner')
  // Pulse the Shopping tab when an item is added from elsewhere, so the user
  // knows where it went. We bump our own counter only for adds that happen
  // while another tab is showing (no point pulsing the tab you're looking at).
  const addCount = useSyncExternalStore(shopping.subscribeAdds, shopping.getAddCount, shopping.getAddCount)
  const tabRef = useRef(tab)
  tabRef.current = tab
  const prevAddCount = useRef(addCount)
  // One pulse channel for the bottom nav, driven by two sources: a new item
  // landing on the shopping list from another screen, and the coach wanting to
  // draw you to the tab where the next tip lives.
  const [pulse, setPulse] = useState({ tab: 'shopping', n: 0 })
  useEffect(() => {
    if (addCount !== prevAddCount.current) {
      prevAddCount.current = addCount
      if (tabRef.current !== 'shopping') setPulse((p) => ({ tab: 'shopping', n: p.n + 1 }))
    }
  }, [addCount])

  // First-run coach (hands-on onboarding — separate from the Onboarding
  // slideshow). The current step drives which contextual tip a screen shows.
  const coachStep = useCoachStep()
  const activeCount = items.filter((i) => i.status === 'active').length
  // Plus entitlement gate (shopping list + fridge tracking are paid).
  // Staging preview: ?free shows the post-trial free experience, ?plus the full
  // app — so you can see exactly what a user gets in either state without waiting
  // out a real trial.
  const meState = useMe()
  const plusReal = useIsPlus()
  const previewParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const plus = previewParams?.has('free') ? false : previewParams?.has('plus') ? true : plusReal
  // null = closed; 'new' = blank add form; object = editing that item
  const [editing, setEditing] = useState(null)
  const [account, setAccount] = useState(false)
  const [installGuide, setInstallGuide] = useState(false)
  const [help, setHelp] = useState(false)
  const [report, setReport] = useState(false)
  const [helpUnseen, setHelpUnseen] = useState(() => hasUnseen())
  const [booting, setBooting] = useState(true)

  function openHelp() {
    markSeen()
    setHelpUnseen(false)
    setHelp(true)
  }
  // Intro walkthrough: shown once per ACCOUNT (firstrun namespaces the flag by
  // userId), so a brand-new account gets it again even on a browser that's seen
  // it. `onboardBump` just forces a re-read after we mark it done. Until we know
  // who's signed in (userId === null), treat as "seen" so the app doesn't flash
  // the walkthrough before the account resolves.
  const [onboardBump, setOnboardBump] = useState(0)
  const onboarded = userId === null ? true : firstrun.seen('fridge.onboarding.hide', userId)

  function finishOnboarding() {
    firstrun.markSeen('fridge.onboarding.hide', userId)
    setOnboardBump((n) => n + 1)
  }

  // Load saved inventory + shopping list from durable storage on launch.
  useEffect(() => {
    initStore()
    initShopping()
    initStaplePrefs()
  }, [])

  // Point the "your last dinner" memory at the current account.
  useEffect(() => {
    dinnerLast.setAccount(userId)
  }, [userId])

  // Load Plus entitlements when the session is ready (and in open mode); clear
  // them on sign-out. This is the source of truth for the paywall gates.
  useEffect(() => {
    if (authEnabled && authLoading) return
    if (authEnabled && !session) {
      me.clear()
      return
    }
    me.load()
  }, [authEnabled, authLoading, session?.user?.id])

  // Auto-advance past "scan" the instant they've actually added something — the
  // rest of the tips key off their real items, so this hands over to "organise".
  useEffect(() => {
    if (coachStep === 'scan' && activeCount > 0) coach.reach('organise')
  }, [coachStep, activeCount])

  // When the next tip lives on another tab (shopping / chat), pulse that tab so
  // they know where to look.
  const coachPulsed = useRef(null)
  useEffect(() => {
    if ((coachStep === 'shop' || coachStep === 'cook') && coachPulsed.current !== coachStep) {
      coachPulsed.current = coachStep
      const target = coachStep === 'shop' ? 'shopping' : 'chat'
      if (tabRef.current !== target) setPulse((p) => ({ tab: target, n: p.n + 1 }))
    }
  }, [coachStep])

  // Testing/preview shortcuts:
  //   ?reset=1   — clear the local "seen" flags and reload, so you get the
  //                full first-run experience (onboarding + install guide) again.
  //   ?install=1 — jump straight to the Add-to-Home-Screen explainer (the
  //                auto-popup is mobile-only, so this lets you preview anywhere).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('reset')) {
      // Clear both the account-namespaced first-run flags and the old global
      // ones, so ?reset gives a clean first-run on any build.
      firstrun.clearSeen('fridge.onboarding.hide', userId)
      firstrun.clearSeen('fridge.install.hide', userId)
      firstrun.clearSeen('fridge.dinnercoach', userId)
      try {
        localStorage.removeItem('fridge.onboarding.hide')
        localStorage.removeItem('fridge.install.hide')
        localStorage.removeItem('fridge.coach.v1')
      } catch {
        /* private mode */
      }
      window.location.replace(window.location.pathname)
      return
    }
    if (params.has('install')) {
      setInstallGuide(true)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Returning from Stripe checkout: confirm the session (grants Plus), flash a
  // thank-you, and strip the query params from the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (!checkout) return
    const clean = () => window.history.replaceState({}, document.title, window.location.pathname)
    if (checkout === 'success' && params.get('session_id')) {
      confirmCheckout(params.get('session_id'))
        .then(() => {
          track('subscribed') // conversion: a paid Plus subscription completed
          me.load() // unlock the list + fridge tabs straight away
          toast.show('Welcome to Plus — thank you! 💚', 3000)
        })
        .catch(() => toast.show('Payment received — it may take a moment to show.', 3000))
        .finally(clean)
    } else {
      clean()
    }
  }, [])

  // Cloud sync: when signed in, pull this account's data from Supabase and
  // write changes through; on sign-out, clear the local copy. This is what
  // ties data to the account (and keeps it off another account on the device).
  useEffect(() => {
    if (!authEnabled || authLoading) return
    if (session?.user) startSync(session.user)
    else stopSync()
  }, [authEnabled, authLoading, session?.user?.id])

  // Nudge mobile web visitors (most arrive by scanning the QR on the site) to
  // add the app to their home screen — once, after they're past onboarding and
  // into the app, and never if they're already running it installed.
  useEffect(() => {
    if (!onboarded) return
    if (authEnabled && (authLoading || !session)) return
    if (firstrun.seen('fridge.install.hide', userId)) return
    if (!isMobile() || isStandalone()) return
    const t = setTimeout(() => setInstallGuide(true), 1200)
    return () => clearTimeout(t)
  }, [onboarded, authEnabled, authLoading, session, userId])

  // Loss-framed "trial ends tomorrow" nudge: on the last day of the trial, once,
  // remind them exactly what's about to lock (fridge, list, saved meals) so they
  // upgrade while they still have it — loss aversion converts harder than "ended".
  useEffect(() => {
    if (!meState.loaded || !meState.trial) return
    if (meState.trialDaysLeft > 1) return
    try {
      if (localStorage.getItem('fridge.trialEnding.shown') === '1') return
      localStorage.setItem('fridge.trialEnding.shown', '1')
    } catch {
      return
    }
    const t = setTimeout(() => upgrade.show('trial_ending'), 900)
    return () => clearTimeout(t)
  }, [meState.loaded, meState.trial, meState.trialDaysLeft])

  // One-time "your free trial has ended" nudge: the first time a lapsed user
  // (now on Free, no longer trialling or paying) opens the app, open the Plus
  // sheet framed as keeping what they had. Shown once, then flagged — reactive
  // limit prompts still cover them after that.
  useEffect(() => {
    if (!authEnabled || authLoading || !session?.user || !onboarded) return
    try {
      if (localStorage.getItem('fridge.trialEnded.shown') === '1') return
    } catch {
      return
    }
    let cancelled = false
    getMe()
      .then((me) => {
        if (cancelled) return
        const lapsed = me && me.authEnabled !== false && me.tier === 'free' && !me.paid && !me.trial
        if (!lapsed) return
        try {
          localStorage.setItem('fridge.trialEnded.shown', '1')
        } catch {
          /* private mode — it may show again, which is harmless */
        }
        setTimeout(() => {
          if (!cancelled) upgrade.show('trial_ended')
        }, 900)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authEnabled, authLoading, session?.user?.id, onboarded])

  function dismissInstall() {
    firstrun.markSeen('fridge.install.hide', userId)
    setInstallGuide(false)
  }

  function handleSave(values, id) {
    if (id) store.update(id, values)
    else store.add(values)
    setEditing(null)
  }

  // Self-playing USP reel for screen-recording — open with ?showreel. Renders
  // alone (no app chrome) and works without sign-in; normal users never see it.
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('showreel')) {
    return <Showreel />
  }

  // Pick the screen to show into `content`, then render the install guide
  // alongside it below — so the guide can overlay ANY screen (including the
  // sign-in screen), which is what makes ?install=1 previewable everywhere.
  let content
  if (authEnabled && authLoading) {
    // While the session is still resolving, hold a blank screen rather than
    // flashing the app to someone who may not be signed in.
    content = <div className="app" />
  } else if (authEnabled && !session) {
    // Account gate: when accounts are switched on and nobody is signed in, the
    // login screen stands in for the whole app. (Open mode skips this entirely.)
    content = <AuthScreen />
  } else if (!onboarded) {
    // Walkthrough — shown once per account, right after sign-in, before the app.
    content = <Onboarding onDone={finishOnboarding} onNeverShow={finishOnboarding} />
  } else {
    content = (
    <div className="app">
      {/* Tonight — the photo → dinner lead. Free + the hero of the app. */}
      {tab === 'dinner' && (
        <DinnerSnap
          userId={userId}
          plus={plus}
          onAccount={authEnabled ? () => setAccount(true) : null}
          onGoChat={() => setTab('chat')}
        />
      )}

      {/* My food — Plus. Free users see the upsell instead. */}
      {tab === 'inventory' &&
        (plus ? (
          <InventoryScreen
            items={items}
            onEdit={(item) => setEditing(item)}
            onAddManual={() => setEditing('new')}
            onGoScan={() => setTab('scan')}
            onGoChat={() => setTab('chat')}
            onAccount={authEnabled ? () => setAccount(true) : null}
            onHelp={openHelp}
            helpBadge={helpUnseen}
          />
        ) : (
          <LockedFeature kind="fridge" headerTitle="My food" />
        ))}

      {/* Scan feeds the tracked fridge, so it's Plus too. */}
      {tab === 'scan' &&
        (plus ? (
          <ScanScreen onDone={() => setTab('inventory')} onAddManual={() => setEditing('new')} />
        ) : (
          <LockedFeature kind="fridge" headerTitle="Scan" />
        ))}

      {/* Ask — free (it's the same meal magic as Tonight). */}
      {tab === 'chat' && (
        <ChatScreen
          items={items}
          onGoScan={() => setTab('scan')}
          onAddManual={() => setEditing('new')}
          onAccount={authEnabled ? () => setAccount(true) : null}
        />
      )}

      {/* My list — Plus. */}
      {tab === 'shopping' &&
        (plus ? <ShoppingScreen list={list} items={items} /> : <LockedFeature kind="list" headerTitle="My list" />)}

      {tab === 'inventory' && plus && (
        <button className="fab" onClick={() => setEditing('new')} aria-label="Add an item by hand">
          <IconPlus size={26} />
        </button>
      )}

      <Nav
        tab={tab}
        onChange={setTab}
        pulseTab={pulse.tab}
        pulseAt={pulse.n}
        lockedKeys={plus ? [] : ['scan', 'inventory', 'shopping']}
      />

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
        {account && (
          <AccountSheet onClose={() => setAccount(false)} />
        )}
      </AnimatePresence>

      <Toast />
      <UpgradeGate />

      <ErrorBoundary fallback={null}>
        <AnimatePresence>{booting && <Splash key="splash" onDone={() => setBooting(false)} />}</AnimatePresence>
      </ErrorBoundary>
    </div>
    )
  }

  return (
    <>
      {content}
      <AnimatePresence>
        {installGuide && <InstallGuide onClose={dismissInstall} />}
      </AnimatePresence>

      <AnimatePresence>
        {help && (
          <HelpSheet
            onClose={() => setHelp(false)}
            onReplay={() => { setHelp(false); setOnboarded(false) }}
            onInstall={() => { setHelp(false); setInstallGuide(true) }}
            onReport={() => { setHelp(false); setReport(true) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {report && <ReportSheet onClose={() => setReport(false)} />}
      </AnimatePresence>
    </>
  )
}
