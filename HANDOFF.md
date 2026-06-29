# Build handoff — the engine behind *What's in my Fridge* (reuse for a new app)

This document describes, in depth, every system built into the *What's in my
Fridge* PWA so a fresh Claude Code session (or developer) can **reuse the same
foundation for a new app**. The bottom section is left blank for you to paste
your new app idea — the AI should keep ~80% of this architecture and only swap
the domain-specific 20%.

> **How to use this:** Give this whole file to a new Claude Code session. The
> top (Parts 1–9) is the reusable framework. Part 10 is where you describe the
> new product. Tell it: *"Keep the architecture, systems and patterns in Parts
> 1–9; build the product described in Part 10 on top of them."*

---

## 1. What it is (the reusable shape)

Underneath the food, this is a generic engine:

> **Photo → AI extracts a structured inventory → AI gives actionable suggestions
> from what you own → it flags what's missing → wrapped in auth, subscriptions,
> usage metering, offline sync, email lifecycle and legal scaffolding.**

It's a **mobile-first installable PWA** with a thin serverless backend. Single
codebase, deployed on Vercel, backed by Supabase + Stripe + the Anthropic API.

### Core product principles (keep these)
- **Free hook, paid depth.** One genuinely useful thing is always free; the
  powerful/repeat features are the paid tier ("Plus", £3.99/mo).
- **Never charge twice for the same AI output.** Generated results are cached by
  id and by name so re-opening never re-bills a credit.
- **Estimates are labelled as estimates**, always with a disclaimer; never imply
  false precision (calorie figures, valuations, etc.).
- **Stay within 12 serverless functions** (Vercel Hobby limit — see §4). Extend
  existing endpoints via a `kind` field rather than adding files.
- **Everything degrades gracefully.** Each integration is inert until its keys
  are set, so the app runs locally and pre-launch without Supabase/Stripe/Resend.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| **Frontend** | React 18 + Vite, `framer-motion` for animation |
| **PWA** | `vite-plugin-pwa` (Workbox) — offline, installable, auto-update |
| **Backend** | Vercel serverless functions (`api/*.js`), thin wrappers over shared `server/core.js`. A local Express server (`server/index.js`) mirrors the same routes for dev. |
| **AI** | Anthropic SDK (`@anthropic-ai/sdk`) — a vision model + a cheaper chat model, both via tool-use for structured JSON output |
| **Auth + DB** | Supabase (`@supabase/supabase-js`) — auth, Postgres, RLS, service-role admin client |
| **Payments** | Stripe (`stripe`) — subscription, checkout, billing portal, webhooks |
| **Email** | Resend (REST via `fetch`, no SDK) — lifecycle + owner reports |
| **Monitoring** | Sentry (`@sentry/react`) + Vercel Analytics |
| **Tests** | Vitest |
| **Hosting** | Vercel (app + serverless + cron). App domain + a separate marketing site. |

**Scripts:** `npm run dev` (web + api concurrently), `npm run build`,
`npm test` (vitest), `npm run dev:api` / `start:api` (Express only).

---

## 3. Architecture & request flow

```
React app (src/)
  └─ src/lib/api.js  ── fetch ──▶  /api/*.js (Vercel)  OR  Express (server/index.js, dev)
                                        │
                                        ▼
                                  server/core.js   ← all shared business logic
                                    ├─ server/auth.js    (Supabase auth, tiers, quota)
                                    ├─ server/stripe.js  (checkout, portal, webhook)
                                    ├─ server/notify.js  (Resend lifecycle, cron, snapshot)
                                    └─ server/email.js   (Resend templates + send)
```

**Key pattern:** every handler returns `{ status, body }`. The thin `api/*.js`
wrapper and the Express route both just forward that. So **all logic is testable
without HTTP**, and the same code runs locally and in production.

---

## 4. Serverless functions (the 12-function constraint)

Vercel Hobby caps you at **12 serverless functions, and we're AT 12.** To add
capability without a new file, fold it into an existing endpoint via a `kind` or
query flag (e.g. `/api/meals` also serves recipes via `kind:'method'`; `/api/report`
also runs the cron, the email preview, and unsubscribe).

| Function | Purpose |
|---|---|
| `api/vision.js` | Photo → structured item list (vision model) |
| `api/chat.js` | Free-text Q&A / suggestions from inventory |
| `api/meals.js` | Meal suggestions **and** full recipe (`kind:'method'`) |
| `api/dish.js` | "I want to make X" → have-vs-need split |
| `api/me.js` | Signed-in user's tier + this month's usage |
| `api/health.js` | Health check **and** Supabase keep-alive (`?ping=1`) |
| `api/checkout.js` | Create Stripe Checkout session |
| `api/checkout-confirm.js` | Confirm a completed checkout |
| `api/billing-portal.js` | Open Stripe billing portal |
| `api/stripe-webhook.js` | Stripe webhook (raw body) → tier updates |
| `api/delete-account.js` | GDPR account + data deletion |
| `api/report.js` | Problem report form • daily cron (welcome/trial/re-engage/**founder snapshot**) • email preview • unsubscribe |

---

## 5. The AI system (vision + chat)

- **Two models** (env-configurable): a sharper **vision model** for photos
  (`VISION_MODEL`, default Sonnet) and a cheaper **chat model** for text
  (`CHAT_MODEL`, default Haiku). Paid/early-trial users get the sharper vision
  model; free/late-trial get the cheaper one.
- **Structured output via tool-use:** every AI call defines a JSON tool schema
  and forces `tool_choice`, so the model returns validated structured data, not
  prose to parse. Server then sanitises/bounds every field.
- **Prompt caching:** stable system instructions use `cache_control: ephemeral`;
  per-user blocks (diet, staples) are appended uncached.
- **Cost controls:** input bounds (image size, question length, inventory size),
  per-tier monthly quotas + a daily anti-abuse cap, and **usage is refunded on
  failure** so a user is never charged for an errored call.
- **Safety guardrails baked into prompts:** food-safety endpoints, never claim
  "allergen-free", redirect medical questions, label estimates as estimates.

---

## 6. Auth, tiers & quota metering (`server/auth.js`)

- **Supabase auth** with a service-role **admin client** (`admin()`) for the
  server's own reads/writes (bypasses RLS). `authEnabled()` is false until
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set → app runs in open mode.
- **Tiers:** `free` and `plus`. Plus = paying. A **14-day trial** gives new
  accounts full Plus, anchored to the auth user's real `created_at`.
- **`guard(token, kind)`** is the gate every AI endpoint calls: authenticates,
  resolves the plan, checks the monthly quota + daily cap, records usage, and
  returns either an error to forward or a `usageId` to refund on failure.
- **Anti-abuse:** a per-device trial limit (`TRIAL_DEVICE_LIMIT`) stops one
  device farming endless trials; a bypass list (`TRIAL_BYPASS_EMAILS`) exempts
  your own test accounts.
- **Test/override env:** `AI_TEST_UNLIMITED=1` lifts limits + extends the trial
  for testing. `TRIAL_DAYS`, `TRIAL_PREMIUM_HOURS` tune the trial.

---

## 7. Payments (Stripe — `server/stripe.js`)

- **Subscription** at £3.99/mo (`STRIPE_PRICE_ID`).
- **Checkout** (`/api/checkout` → `checkout-confirm`) and **billing portal**
  (`/api/billing-portal`) for managing/cancelling.
- **Webhook** (`/api/stripe-webhook`, raw body, verified with
  `STRIPE_WEBHOOK_SECRET`) flips `profiles.tier` to `plus`/back, and stores
  processed event ids in a `stripe_events` table for **idempotency**.
- New-subscriber notification email to the owner.

---

## 8. Data model

### Supabase tables (Postgres, RLS per user)
| Table | Holds |
|---|---|
| `profiles` | `id` (=auth uid), `tier`, `created_at`, `device_id`, `stripe_customer_id`, `stripe_subscription_id`, lifecycle flags (`welcomed_at`, `trial_reminded_at`, `reengaged_at`, `unsubscribed_at`) |
| `items` | the user's inventory (cloud mirror of the local store) |
| `shopping_items` | the shopping list |
| `saved_meals` | saved meals + cached recipe method |
| `staple_prefs` | staples / diet / allergen prefs |
| `ai_usage` | per-call usage rows for quota accounting |
| `stripe_events` | processed webhook event ids (idempotency) |

RLS: each user can only see their own rows; the server uses the service-role key
to bypass RLS for admin tasks (cron, webhooks).

### Local-first stores (`src/lib/*.js`)
Data is **local-first**: IndexedDB (+ localStorage mirror) is the source of
truth on-device, with **write-through cloud sync** when signed in.
- `store.js` (inventory), `shopping.js` (list), `meals.js` (saved meals + method
  cache), `staples.js` (staples/diet), plus `chat.js`, `dinnerLast.js`, etc.
- `cloud.js` + `syncState.js` + `SyncBanner.jsx` handle sync + an offline/
  not-synced indicator with retry.
- Each store exposes a `subscribe`/snapshot pair for `useSyncExternalStore`, and
  an "adds" channel that pulses the bottom-nav icon when items land.

---

## 9. Cross-cutting systems

- **PWA auto-update** (`vite.config.js` + `src/main.jsx`): `registerType:
  'autoUpdate'`, `skipWaiting`, `clientsClaim`, `cleanupOutdatedCaches`; polls
  every 60s + on focus; reloads onto a new deploy automatically (skipping the
  first-ever claim). Cached phones never get stuck on old versions.
- **Email lifecycle** (`server/notify.js` + `email.js`, via Resend): welcome,
  trial-ending reminder, re-engagement (with one-click unsubscribe), new-subscriber
  alert, problem reports, and a **daily owner "founder snapshot"** (users / trials
  / paying / conversion / est. revenue + take-home). All driven by a daily Vercel
  cron hitting `/api/report` with `CRON_SECRET`.
- **Supabase keep-alive:** a second daily cron hits `/api/health?ping=1` to keep
  the free Supabase project from auto-pausing.
- **Monitoring:** Sentry (`VITE_SENTRY_DSN`) + Vercel Analytics.
- **Legal/security:** `public/terms.html`, `public/privacy.html`, contextual
  `SafetyNote` component, and enforced CSP + security headers in `vercel.json`.
- **Onboarding/UX kit:** intro slideshow, hands-on coach tips, what's-new,
  install guide, upgrade sheets/gates, account management, report-a-problem.

---

## 10. Environment variables (full list)

**Server (Vercel / `.env`):**
- `ANTHROPIC_API_KEY` — AI
- `VISION_MODEL`, `CHAT_MODEL`, `RECEIPT_MODEL` — model overrides (optional)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — server-side Supabase (admin)
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` — payments
- `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL`, `OWNER_EMAIL` — email
- `CRON_SECRET` — protects the daily cron + keep-alive
- `APP_URL` — base URL for links in emails
- `UNSUBSCRIBE_SECRET` — HMAC for one-click unsubscribe
- `TRIAL_DAYS`, `TRIAL_PREMIUM_HOURS`, `TRIAL_DEVICE_LIMIT`, `TRIAL_BYPASS_EMAILS`,
  `AI_TEST_UNLIMITED` — trial/limit tuning
- `API_PORT`, `NODE_ENV` — local dev

**Client (Vite, `VITE_` prefix — safe to expose):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — client Supabase (RLS-bound)
- `VITE_SENTRY_DSN` — error monitoring

---

## 11. Dev & deploy workflow

- **Local:** `npm run dev` runs Vite + the Express API together. The app works
  with no keys (open mode); add keys to a `.env` to light up each system.
- **Tests:** `npm test` (Vitest). Keep them green — the quota maths, categorisation
  and sync logic are unit-tested.
- **Deploy:** push to a feature branch, then **fast-forward `main`** — Vercel
  deploys `main` (app) automatically. There's a separate marketing site.
- **Two crons** in `vercel.json`: daily report (`/api/report`) and keep-alive
  (`/api/health?ping=1`).

---

## 12. What to reuse vs swap for a new app

- **Reuse as-is (~80%):** auth + tiers + Stripe + quota metering, the
  vision→inventory→suggestion→shopping engine + caching, PWA/offline/sync, email
  lifecycle + founder snapshot + keep-alive, monitoring, legal/CSP scaffold, the
  whole component/store/hook pattern, and the `{status,body}` handler architecture.
- **Swap (~20%):** the AI **prompts** (domain knowledge), the **item schema /
  categories**, the **suggestion output** (what the AI returns), the **copy/labels**,
  and the **branding** (logo, palette, fonts). Add any genuinely new piece your
  idea needs (e.g. a price source, a compliance report exporter).

Keep all the principles in §1. Stay under 12 functions. Label estimates. Cache
AI output. Degrade gracefully.

---

---

# PART 13 — MY NEW APP IDEA  ✍️  (fill this in)

> Paste your new product brief below. Describe what it does, who it's for, the
> "snap → result" core loop, what each tier (free vs paid) gets, the new item
> schema/categories, any new data source it needs, and the branding direction.
> The AI should build THIS on top of Parts 1–12.

### The product (one line)
<!-- e.g. "Snap your X → it tells you Y" -->


### Who it's for


### The core loop (what the user does → what the AI returns)


### Free vs paid (keep the free-hook / paid-depth model)
- **Free:**
- **Paid:**

### New item schema / categories (replaces the fridge inventory shape)


### Any new data source or integration needed (beyond what's in Parts 1–12)


### Branding (name, colours, fonts, tone)


### Anything to explicitly KEEP or DROP from the existing app


---

_When this is filled in, hand the whole file to a new Claude Code session with:
"Keep the framework in Parts 1–12; build the product in Part 13 on top of it.
Start by proposing the new item schema and the AI prompt changes, then the
screen-by-screen plan."_
