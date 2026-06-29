# Master prompt — reskinning the engine into a collectibles value-tracker

This document is a **kickoff brief**. It (A) describes the framework we already
built for *What's in my Fridge*, and (B) states exactly how we want to reskin it
into a **collectibles inventory + resale-value tracker**. Hand the "Copy-paste
kickoff prompt" at the bottom to Claude Code (or a developer) to start the build.

Working title: **Vault** (placeholder — *"snap it, catalogue it, know what it's
worth"*). Final brand TBD.

---

## PART A — The framework we already have (reuse ~80% of it)

*What's in my Fridge* is, underneath the food, a generic engine:

> **Photo → AI catalogues it into a structured inventory → AI gives actionable
> suggestions from what you own → it flags what you're missing → wrapped in
> auth, subscriptions, usage metering, offline sync and legal scaffolding.**

### Stack
- **Frontend:** React 18 + Vite, PWA via `vite-plugin-pwa` (offline, installable,
  service worker with auto-update on new deploys). Animations with `framer-motion`.
- **Backend:** Vercel serverless functions in `api/*.js` (thin wrappers) that all
  call shared logic in `server/core.js`. A local Express dev server (`server/index.js`)
  mirrors the same handlers. **Hard constraint: Vercel Hobby = 12 functions max,
  and we are AT 12** — new endpoints must be folded into existing files (e.g.
  `/api/meals` already doubles as the recipe endpoint via a `kind` field).
- **AI:** Anthropic SDK. A **vision model** (Sonnet) for photo→structured-list,
  a cheaper **chat model** (Haiku) for suggestions/Q&A. Tool-use with JSON schemas
  forces structured output.
- **Auth + data:** Supabase (auth, a `profiles` table with RLS, service-role
  admin client). A daily cron keeps the free project alive.
- **Payments:** Stripe subscription (£3.99/mo), webhook-driven tier flips,
  billing portal, checkout + confirm.
- **Email:** Resend (welcome, trial reminders, re-engagement, owner daily
  snapshot) — all inert until keys are set.
- **Monitoring:** Sentry, Vercel Analytics.

### The reusable engine, by concern
- **Vision → structured inventory** (`api/vision.js` → `server/core.js`
  `visionHandler`): downscale a photo client-side (`src/lib/image.js`), send to
  the vision model, get back a typed list of items (name, category, quantity,
  confidence, etc.). **This is the heart — it generalises to anything photographable.**
- **Inventory store** (`src/lib/store.js`, `useItems.js`): IndexedDB/localStorage
  with cloud sync (`cloud.js`, `syncState.js`, `SyncBanner.jsx`). Items have
  status, location, dates, source.
- **Suggestion engine** (`server/core.js` `mealsHandler`, `methodHandler`,
  `chatHandler`, `dishHandler`): given the inventory + user prefs, the AI returns
  actionable output (meals / a recipe / a "have vs need" split). Generated results
  are **cached so re-opening never re-charges a credit** (`src/lib/meals.js`).
- **"Have vs need" diffing** → shopping list (`src/lib/shopping.js`,
  `ShoppingScreen.jsx`) with dedup.
- **Personalisation** (`src/lib/staples.js`, `diet.js`): user prefs threaded into
  every prompt.
- **Auth + tiers + quota metering** (`server/auth.js`): per-user monthly limits,
  daily anti-abuse cap, 14-day trial, free vs paid model selection, usage
  recorded and **refunded on failure**. `accountSummary` powers `/api/me`.
- **Monetisation UX** (`UpgradeSheet.jsx`, `UpgradeGate.jsx`, `LockedFeature.jsx`,
  `src/lib/upgrade.js`): free hook + Plus upsell pattern.
- **Onboarding / coach / what's-new** (`Onboarding.jsx`, `CoachTip.jsx`,
  `whatsnew.js`), **report-a-problem** (`ReportSheet.jsx`), **account management**
  (`AccountSheet.jsx`), **install guide** (`InstallGuide.jsx`).
- **Legal/safety scaffold:** `public/terms.html`, `public/privacy.html`,
  contextual `SafetyNote.jsx`, enforced CSP + security headers in `vercel.json`.

### Principles to keep
- **Free hook, paid depth.** One genuinely useful thing is always free; the
  power features are Plus.
- **Never charge twice for the same AI output** — cache generated results by id
  and by name.
- **Estimates are labelled as estimates**, with disclaimers, never false precision.
- **Stay under 12 serverless functions** — extend, don't add.

---

## PART B — How we want to reskin it

### The product
A **collectibles inventory + resale-value tracker**. Same flow, new payload:

> **Snap your collection → AI identifies each item (with set/edition/condition) →
> it tells you what each is worth and what the whole collection is worth → it
> flags what to sell now, what's missing to complete a set, and price movements.**

The pivot in one line: from *"use what you own"* to **"know what you own is
worth."** This is a **stronger willingness-to-pay** — people pay to track money.

### Pick a starting vertical (design generic, launch focused)
Choose ONE to launch, because the **price source** differs per category:

| Vertical | Price source(s) |
|---|---|
| **Trading cards** (Pokémon/sports) | TCGplayer / Cardmarket; eBay sold listings |
| **Sneakers** | StockX / GOAT; eBay sold |
| **LEGO sets** | BrickLink / BrickEconomy; eBay sold |
| **Vinyl** | Discogs (has a great API + price guide) |
| **Watches** | Chrono24 / WatchCharts; eBay sold |

**Recommended first launch: Trading cards** (huge market, the value angle
monetises hardest, very "snap-and-catalogue"). **eBay sold/completed listings**
is the universal "what it *actually* sells for" comparable across every category,
so it's the best general-purpose price spine, with a category API layered on for
accuracy.

### What changes vs what's reused
- **Reused as-is (~80%):** auth, Stripe + tiers, quota metering, PWA/offline/sync,
  the vision pipeline, the suggestion-engine plumbing + caching, account/onboarding/
  report/email/legal scaffold, the whole component kit and store pattern.
- **Swapped (~20%):** the AI prompts (collectible identification + valuation),
  the item schema, the "suggestion" output (valuation instead of recipes), the
  copy/labels, the branding — **and one genuinely new piece: a price source.**

### New / changed pieces
1. **Item schema** (extend `store.js` item shape):
   `name, category, setOrSeries, editionOrVariant, year, conditionGrade,
   quantity, photoRef, estValue, valueLow, valueHigh, valueSource, valueUpdatedAt,
   purchasePrice (optional), notes`.
2. **Vision prompt** (`visionHandler`): identify collectibles precisely — item +
   **set/series + edition/variant + year**, and **suggest a condition grade from
   the photo** (e.g. card centring/edges/corners; sneaker box/wear). Return a
   confidence per field; never invent a specific edition it can't see.
3. **Valuation handler** (fold into the existing `/api/meals` or `/api/dish` slot
   via a `kind` field to stay under 12 functions): take an identified item →
   query the **price source** → return `estValue, low, high, source, updatedAt`.
   Use an **AI estimate only as a labelled fallback** when no comparable is found.
4. **Portfolio view** (reskin `Dashboard.jsx` / `InventoryScreen.jsx`): total
   collection value, value over time (sparkline), top movers, biggest holdings.
5. **"What to sell now"** (reskin the suggestion engine): flag items that have
   spiked, are above purchase price, or are liquid right now — the new equivalent
   of "what's for dinner tonight."
6. **Set completion / "what's missing"** (reskin "have vs need" → shopping list):
   show which cards/sets/variants you're missing and the cheapest way to complete.
7. **Price alerts** (Plus): notify when an item crosses a threshold (reuse the
   email/cron lifecycle).
8. **Condition-grading helper** (Plus): AI guidance on grading from photos —
   labelled as guidance, not an official grade.

### Monetisation (mirror the fridge model)
- **Free hook:** snap and value a few items / your single most valuable item —
  "find out what this is worth" is an irresistible free pull.
- **Plus:** unlimited valuation, full portfolio + history, price alerts,
  set-completion, condition-grading help, export.
- Same Stripe + tiers + metering; tune the monthly limits in `server/auth.js`.

### Risks & legal (must-haves)
- **Valuations are estimates** — clear disclaimer, *"not financial or investment
  advice; actual sale prices vary."* Reuse the `SafetyNote` pattern.
- **Price-source terms** — use official APIs where possible (Discogs, TCGplayer,
  StockX, eBay) and respect their ToS; don't scrape where it's prohibited.
- **No guaranteed-grade claims** — grading help is guidance only; real grades
  come from PSA/BGS etc.
- Update **Terms/Privacy** for the new domain and the pricing-data source.

### Rough build phases
1. **Catalogue MVP** — vision identifies collectibles into the new schema; manual
   value entry; portfolio total. Proves the identification + UX. (No price API yet.)
2. **Live valuation** — wire in eBay-sold (+ one category API); per-item value,
   collection total, "updated at."
3. **Portfolio intelligence** — value-over-time, top movers, "what to sell now."
4. **Set completion + price alerts** (Plus depth) + export.

---

## COPY-PASTE KICKOFF PROMPT

> I have a production PWA called *What's in my Fridge* — a React 18 + Vite app
> with Vercel serverless functions (`api/*.js` → shared `server/core.js`),
> Supabase auth (a `profiles` table + RLS), Stripe subscriptions with tier-based
> usage metering and quotas (`server/auth.js`), an Anthropic vision model that
> turns a photo into a structured inventory and a chat model that returns
> suggestions from that inventory, an offline-syncing IndexedDB/localStorage store
> (`src/lib/store.js`), a shopping-list "have vs need" diff, Resend email
> lifecycle, Sentry, enforced CSP, and a full onboarding/upgrade/account/legal
> component kit. Generated AI results are cached so a credit is never spent twice.
> Constraint: Vercel Hobby caps us at 12 serverless functions and we're at 12, so
> new endpoints must be folded into existing files via a `kind` field.
>
> I want to **reskin this same engine into a collectibles inventory + resale-value
> tracker** (working title "Vault"). Keep the entire foundation — auth, Stripe,
> metering, PWA/offline/sync, the vision→inventory→suggestion pipeline, caching,
> and the account/legal scaffold. Change only: (1) the **item schema** to
> collectibles (name, set/series, edition/variant, year, condition grade,
> quantity, est. value + low/high + source + updatedAt, purchase price); (2) the
> **vision prompt** to identify collectibles precisely (set, edition, year) and
> suggest a condition grade from the photo, with per-field confidence; (3) add a
> **valuation step** that looks up a price source (start with eBay sold/completed
> listings as the universal comparable, plus one category API) and returns an
> estimated value with a labelled AI fallback; (4) reskin the suggestion engine
> into **portfolio value, "what to sell now," and set-completion ("what's
> missing")**; (5) rebrand the UI/copy. Launch focused on **trading cards** first
> but keep the schema generic.
>
> Treat all valuations as **estimates with a "not financial advice" disclaimer**,
> use official price-source APIs within their ToS, and keep the free-hook /
> paid-depth model (free: value your top item; Plus: unlimited valuation, full
> portfolio + history, price alerts, set completion, grading help). Build in
> phases: (1) catalogue MVP, (2) live valuation, (3) portfolio intelligence,
> (4) alerts + set completion. Start by proposing the new item schema and the
> vision-prompt changes, then the valuation handler design.
