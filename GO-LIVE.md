# 🚀 Go-Live Checklist — What's in my Fridge

Everything left to take the app live and start earning. The app itself (code) is
**built and deployed** — what remains is account/config on your side.

Operated as: **John Bell (sole trader), trading as "What's in my Fridge".**

---

## 🚦 Required to go live (critical path)

- [ ] **1. Register as a sole trader (HMRC)**
  - gov.uk → "Set up as a sole trader" → register for **Self Assessment**.
  - Register in **your own name**; "What's in my Fridge" is just a **trading name** (no separate registration needed).
  - You'll get a **UTR** by post (~10 days). Cost: free.

- [ ] **2. Business bank account**
  - Open **Monzo Business (Lite — free)** as a sole trader. Account is in your name; add "What's in my Fridge" as the trading name.
  - This is where **Stripe pays out**. (Don't use a personal account for business.)

- [ ] **3. Branded email**
  - **Cloudflare Email Routing** (free): forward `support@whatsinmyfridge.co.uk` → your Gmail.
  - Already referenced in the app + Privacy/Terms — just needs to exist.

- [ ] **4. Stripe → switch to LIVE mode** (currently sandbox/test)
  - [ ] Product/price: **£3.99/month recurring** → copy `price_…`
  - [ ] Secret key: Developers → API keys → `sk_live_…`
  - [ ] Webhook: Developers → Webhooks → endpoint `https://app.whatsinmyfridge.co.uk/api/stripe-webhook`
        with events `checkout.session.completed`, `customer.subscription.updated`,
        `customer.subscription.deleted` → copy `whsec_…`
  - [ ] Customer Portal: Settings → Billing → Customer portal → **Activate** (allow cancel)
  - [ ] Activate payouts: complete account form (ID + bank; business type = Individual/Sole trader)
  - [ ] Statement descriptor: e.g. `WHATSINMYFRIDGE`

- [ ] **5. Vercel env vars** (project: `whats-in-my-fridge` → Settings → Environment Variables)
  ```
  STRIPE_SECRET_KEY      = sk_live_…
  STRIPE_PRICE_ID        = price_…
  STRIPE_WEBHOOK_SECRET  = whsec_…
  APP_URL                = https://app.whatsinmyfridge.co.uk
  ```
  Then **Redeploy** the app project.

- [ ] **6. Anthropic credit**
  - console.anthropic.com → Billing → keep credit loaded (AI features stop at £0).

- [ ] **7. Live payment test** (do last)
  - Real card → Upgrade → Plus unlocks (limits jump to 60 scans / 200 chats) →
    Manage subscription → cancel → confirm you drop back to Free.

---

## ⚠️ Important operational note

- [ ] **Supabase free-tier pause** — free projects pause after ~1 week of inactivity,
  which is risky for a live app. Keep it active, or upgrade to **Pro (~$25/mo)** once you have users.

---

## 🟢 Soon after launch (recommended, not blocking)

- [ ] **Trademark the name** — gov.uk → "Apply to register a trademark" →
  **Class 9 (software/app) + Class 42 (software-as-a-service)**. ~£170–220.
  Do it once the name's confirmed / there's early traction (protects the brand before you market it).
  *(Separate from HMRC. Checked the IPO database — no conflicting marks found.)*
- [ ] **Sentry monitoring** — create a project → add `VITE_SENTRY_DSN` to Vercel. Code already wired (dormant until set).
- [ ] **Growth** — SEO blog + a launch (Product Hunt, socials). The lever that actually drives revenue.

---

## ✅ Already done (code side — no action needed)

- App + backend: scan, freshness (with long-life/perishable handling), chat, dish-check,
  shopping by aisle, staples, saved meals, "what's new".
- Payments code, billing portal, webhook handling, 7-day trial, per-user metering.
- Privacy/Terms (subscription terms + `support@` contact), GDPR export/delete.
- Marketing site + SEO + share image, PWA auto-update.
- `APP_URL` fallback fixed; Sentry wired (dormant).

---

## Accounts / services used

| Service | Purpose |
|---|---|
| **GitHub** | Code + version control (`johnpbell7/whats_in_my_fridge`) |
| **Vercel** | Hosting + deploy (app + marketing site + `/api` functions) |
| **Supabase** | Database, auth, storage |
| **Anthropic (Claude API)** | AI — scanning + chat |
| **Stripe** | Subscription payments |
| **GoDaddy** | Domain + DNS (`whatsinmyfridge.co.uk`) |
| **Google Search Console** | SEO indexing |
| **Google Fonts** | Typography (app) |
| **Sentry** (optional) | Error monitoring |
| **Cloudflare** (optional) | Email forwarding |

> **Env vars / secrets** live in the dashboards (Vercel/Supabase/Stripe/Anthropic), **not** in this repo.
> See `.env.example` for the full list to set when restoring.

---

### Minimum to take money: steps 1–7. Trademark + Sentry are smart follow-ups, not blockers.
