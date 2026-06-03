# What's in my Fridge — Design Brief

_A complete description of what the app is, who it's for, and everything it can do._

---

## 1. In one line

**A private, offline-first phone app that always knows what's in your fridge, freezer and pantry — you fill it by snapping a photo or a receipt, it warns you what's about to go off, learns the staples you always keep, builds your shopping list, files what you buy back into the right place, and answers "what can I make for dinner?" from what you actually have.**

## 2. The problem it solves

Everyday food management is full of small, annoying frictions:

- You're at the shops and can't remember if you already have eggs.
- Food quietly expires at the back of the fridge and gets binned.
- You keep running out of the same staples (milk, bread, butter) and only notice when they're gone.
- "What's for dinner?" is a daily blank stare into the fridge.

The app removes the friction at every step: **capturing** what you have should take seconds, **remembering** it should be automatic, and **acting on it** (using things up, restocking, cooking) should be one tap.

## 3. Who it's for

A single household cook on their own phone. The design optimises for **one person, one device, used on the move** — quick glances while shopping, fast photo capture while unpacking, no accounts, no setup, works with no signal in the shop. (Multi-device sync is a deliberate future step, not a current need.)

## 4. Design principles

1. **Capture beats typing.** A photo or receipt proposes the items; the user just confirms. Manual entry is always available but never required.
2. **The app proposes, the human decides.** Vision results, locations, expiry dates and staples are all _suggestions_ you can accept or override. Nothing is silently committed.
3. **Glanceable.** The most urgent thing (expiring food, a missing staple) is the first thing you see, at the top, colour-coded.
4. **Works offline, remembers forever.** The inventory is the product; it must survive flights, dead signal, app restarts and OS storage pressure.
5. **Calm, tactile, food-warm.** A fridge-door launch animation, soft paper tones, a green "fresh" accent, gentle spring motion. It should feel like a tidy kitchen, not a spreadsheet.
6. **Honest about uncertainty.** Low-confidence scans are flagged "check"; the app never invents food that isn't there.

## 5. Visual & interaction language

- **Palette:** warm paper surfaces (`#fffdf9`), ink text (`#1f1b16`), a fresh **green accent** (`#2f7d5a`) for actions, **amber** (`#bf6432`) for "use soon", **red** (`#b1433a`) for expired/discard. Brushed-steel greys for the launch doors.
- **Type:** a display serif for headings/brand, clean sans for body; tabular numerals for counts.
- **Motion:** Framer Motion springs throughout — rows settle in, sheets slide up, the splash fridge doors part to reveal the app, a confirmation toast rises and fades.
- **Icons:** a small hand-rolled stroke icon set (no icon dependency, no emoji).
- **Layout:** a single-column mobile screen with a **bottom tab bar** and a floating **+** button; modals are bottom sheets.

## 6. Platform & architecture

- **Installable PWA** (Add to Home Screen) — runs full-screen, portrait, like a native app; theme/launch colours blend into the intro so there's no flash.
- **Frontend:** React 18 + Vite, animated with Framer Motion.
- **Backend:** a tiny API that holds the Anthropic key. Locally it's an Express server (`server/index.js`); in production the same logic (`server/core.js`) runs as **Vercel serverless functions** (`api/*.js`). The browser only ever talks to `/api` — **the API key is never in the browser bundle.**
- **AI:** Anthropic Claude — **vision** (`claude-sonnet-4-6`) for photo/receipt reading, **chat** (`claude-haiku-4-5`) for fridge Q&A. Both overridable via `VISION_MODEL` / `CHAT_MODEL` env vars.
- **Storage:** browser **IndexedDB** (durable, marked persistent on installed PWAs) with a **localStorage mirror** as backup and for cross-tab sync. No external database; all inventory data is on-device.
- **Deploy:** Vercel, with a GitHub Actions workflow that auto-publishes on every push to `main`.

## 7. Information architecture — four tabs

| Tab | Purpose |
| --- | --- |
| **Inventory** | What you have now; expiry alerts; staple "running low" alerts; archive of used/gone items; a Staples view of your usuals. |
| **Shopping** | The buy list; staple suggestions; "put away" purchased items into the fridge. |
| **Scan** | Add items in bulk from a photo of your fridge/groceries, or from a till receipt. |
| **Chat** | Ask questions about your fridge and get meal ideas. |

A floating **+** (on Inventory) opens the manual add form. The app boots behind a fridge-door **splash** animation while durable storage loads.

---

## 8. Feature reference — everything it can do

### 8.1 Capture: Scan a photo or receipt

The fastest way to fill the fridge.

- **Two modes:** _Fridge / groceries_ (recognise products in a photo of your fridge or shopping) and _Receipt_ (read every food/drink line off a till receipt).
- **Photo handling:** the captured image is **downscaled on-device** (max 1568px edge, JPEG q0.82) before upload — fast, small, and within serverless body limits, while staying legible enough to read receipt text.
- **Vision recognition:** Claude returns a **validated list** via a structured tool call (name, category, quantity, unit, confidence) rather than free text. Groceries prompt scans the whole frame thoroughly and counts duplicates as quantity; receipt prompt expands cryptic till abbreviations (e.g. "GBL MLK 2PT" → "Whole milk") and ignores totals, tax, bags and non-food lines.
- **Confirm-before-save:** results appear as an editable checklist. You can untick wrong items, rename them, change category, adjust quantity, and **add anything the photo missed**. Low-confidence items (<0.6) are flagged **"not sure."**
- **Filing:** choose **Auto** (each item filed where it usually lives — see heuristics) or force everything to fridge/freezer/pantry. A use-by date is estimated for each.
- **Graceful empties/errors:** if nothing is recognised, you get a friendly "add one anyway" path; API/credit/key errors surface as clear, specific messages.

### 8.2 Inventory: what you have

The home screen and source of truth.

- **In stock · Used & gone · Staples:** a segmented toggle. _In stock_ is the live fridge; _Used & gone_ is the archive of things you've marked used or thrown out (restore one if you change your mind); _Staples_ lists your frequently-stocked items (see 8.5).
- **Location filter chips:** All / Fridge / Freezer / Pantry, each with a live count.
- **Search** by name.
- **Expiry-first sorting:** expired items first, then soonest to expire, then dated, then undated — so the things that need attention float to the top.
- **Expiry states & colour:** **expired** (red), **use soon** (≤2 days, amber), ok, or no date. A **banner** at the top counts items needing using soon.
- **Per-item actions:** tap to edit; **✓** mark used; **🗑** mark finished/thrown out; (in archive) **↺** put back.
- **Auto-file:** if items are filed somewhere other than where they'd usually belong, a one-tap **"Auto-file N items where they belong"** prompt appears.

### 8.3 Add / edit an item by hand

A bottom-sheet form for precise control.

- Fields: **name, category, quantity, unit, location, use-by date, notes.**
- **Smart location:** while you type a new item's name, it auto-files to the likely place (until you pick one yourself).
- **Suggested use-by:** a one-tap estimate from category + location (you can ignore it).
- **"Keep this stocked" toggle:** pin the item as a **staple** so the app flags it whenever you run out (see Staples).
- **Delete** from the same sheet when editing.

### 8.4 Shopping list

- **Add** anything to buy; newest on top, **tick off** as you shop, checked items sink to the bottom.
- **Staple suggestions:** a _"Usually stocked — tap to add"_ row offers run-out staples not already on the list (de-duped — can't add the same thing twice).
- **Put purchased items away:** once you tick items (= bought), a **"Put N away"** button files every ticked item straight into the inventory — choosing the area (fridge/freezer/pantry) and a use-by date from the item's name — then clears them off the list. A brief **"Added N to your fridge"** toast confirms it.
- **Just clear:** removes ticked items _without_ filing them (for things you didn't actually buy).

### 8.5 Staples & "what's missing"

The app learns your habits and nudges you before you run out.

- **Automatic detection:** every item (active or archived) is grouped by name; anything seen on **3+ separate days** becomes a **staple**. Spellings are folded so "Eggs"/"egg" and "Tomatoes"/"tomato" count together.
- **See them all — the Staples view:** a third segment on the Inventory screen (_In stock · Used & gone · Staples_) lists every staple, in stock or run out, with its status ("N in stock" / "None in stock") and how often it recurs. From here you can **add** a run-out staple to the list, **pin/unpin** one, or **remove** ("not a staple") — so you can browse and curate your usuals any time, not only when something has run out.
- **Missing = a staple with zero stock.** These also surface where you'll act on them:
  - **Inventory:** a green _"Running low on the usuals"_ banner, each with one-tap **Add to list** and a **dismiss (✕)**.
  - **Shopping:** the _"Usually stocked"_ suggestion chips.
- **You stay in control:** pin anything as a staple (the "Keep this stocked" toggle, or the pin in the Staples view), or dismiss an auto-detected one as "not a staple." These preferences are stored durably and separately from the inventory.
- **Closes the loop:** putting a staple away (restocking it) removes it from the "running low" list automatically.

### 8.6 Chat: ask your fridge / get meal ideas

- Ask natural questions — **"Do I have eggs?", "What's expiring soon?", "What can I make for dinner?"** (starter suggestions provided).
- The current **active inventory** (names, categories, quantities, locations, expiry + computed freshness) is sent as context with each question.
- Claude is instructed to be **concise and practical** (you're often on your phone in a shop), to **flag anything expiring within 2 days**, to **suggest meals from what's available**, and to **never invent items** you don't have. If the fridge is empty, it says so.
- Friendly typing indicator; errors (no key/credit/network) show inline.

---

## 9. The intelligence layer

- **Vision (Claude Sonnet):** structured tool output for reliable parsing; thorough whole-frame scanning; receipt abbreviation expansion and non-food filtering; per-item confidence.
- **Chat (Claude Haiku):** fast, cheap, grounded strictly in the user's inventory; prompt-cached instructions to keep latency and cost low.
- **Robust error mapping:** the server turns raw Anthropic errors into plain-English guidance — bad/expired key, no account credit, unavailable model, rate limiting — so failures are never mysterious.
- **Key safety:** the Anthropic key lives only on the server / in Vercel's env; the browser never sees it. A `/api/health` endpoint reports whether a key is configured.

## 10. Built-in heuristics (no AI needed)

These run locally and keep the app useful and fast even offline:

- **Shelf-life defaults by category:** dairy 7d, produce 5d, meat & fish 3d, leftovers 3d, condiments 90d, drinks 14d, other 7d.
- **Use-by estimator:** stretches dates by location — the freezer extends everything (≥60d), the pantry extends non-produce (≥30d).
- **Location suggester:** name keywords win over category (e.g. "frozen pizza" → freezer, "rice"/"tinned"/"coffee" → pantry); otherwise dairy/meat/leftovers/drinks → fridge, condiments/other → pantry.
- **Category guesser** (for name-only shopping items): keyword match into dairy/meat/produce/drinks/condiments, else "other" — so a purchased "milk" lands in the fridge as dairy with a sensible date.
- **Expiry math:** days-until, human labels ("Today", "Tomorrow", "3 days", "12 Jun"), and the expired/soon/ok/none state machine.

## 11. Offline, persistence & resilience

- **Durable on-device storage:** IndexedDB, asked to be _persistent_ on installed PWAs so the OS won't evict it.
- **Belt-and-braces:** every write mirrors to localStorage; a first run migrates any legacy localStorage data; **cross-tab sync** keeps multiple windows consistent.
- **Self-healing service worker:** auto-update, `skipWaiting` + `clientsClaim`, and stale-cache cleanup so a new deploy can never strand the app on a blank screen. API calls are never cached (always hit the network).
- **Error boundaries** around volatile UI so a single failure can't take down the app.

## 12. Privacy & cost

- **Private by default:** the inventory lives on your device, not in any cloud database. It works offline and isn't shared.
- **What leaves the device:** only the photo/receipt you choose to scan (sent to Claude via your own server key) and your chat questions + current inventory context. Nothing is stored server-side.
- **Running cost:** a few pence per photo scan, a fraction of that per chat question; a small Anthropic credit lasts a long time. The whole stack runs on free Vercel hosting.

## 13. Deployment & operations

- **One-time setup** documented in `DEPLOY.md`: deploy to Vercel, add `ANTHROPIC_API_KEY` to its env.
- **Automatic deploys:** a GitHub Actions workflow publishes to the live URL on every push to `main` (needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` repo secrets); the API key stays in Vercel.
- **Health check:** `/api/health` confirms the key is live and which models are in use.
- **Demo switch:** opening the live app with `?demo` reveals a "Load sample data" button to showcase the staples feature without waiting for real history to build up.

## 14. Current limitations (by design or scope)

- **Single device:** data doesn't sync across phones; clearing the browser's storage clears the list. (Sync is the planned Supabase step.)
- **Staple history** is built from items still in the archive — _hard-deleting_ an item removes it from history, whereas marking it used/finished keeps it counted.
- **Category guessing** for shopping items is keyword-based; an unusual name may land as "Other" in the pantry (easily corrected by tapping the item).
- **No scheduled push notifications** — alerts are in-app banners (a true background "you're out of milk" push would need a server-side notification service).

## 15. Where it could go next

- **Multi-device sync** (e.g. Supabase) — the entire data layer is funnelled through one module specifically so it can be repointed at a server without touching any component.
- **Push notifications** for expiring food and missing staples.
- **Quantity-aware depletion** (decrement as you use part of something).
- **Recipe deep-dives** in chat (full method, not just ideas), and shopping-list generation from a chosen recipe.
- **Barcode scanning** as a third capture mode.

---

## Appendix — data model

**Item** (inventory): `id, name, category, quantity, unit, location (fridge|freezer|pantry), added_date, expiry_date, status (active|used|discarded), source (manual|photo), confidence, notes`.

**Shopping item:** `id, name, quantity, checked, added_date`.

**Staple preferences:** `{ pinned: { [key]: {name, location, category} }, ignored: { [key]: true } }` — keyed by a folded item name.

**Storage keys:** IndexedDB database `fridge`, store `kv`, records `items` / `shopping` / `staple-prefs`; localStorage mirrors `fridge.items.v1` / `fridge.shopping.v1` / `fridge.staples.v1`.
