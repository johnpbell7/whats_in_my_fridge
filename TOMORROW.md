# Launch checklist (live status)

Single source of truth for what's left. Items marked **[me]** are things
Claude does once you give the go-ahead. Updated 10 Jun 2026.

## ⚡ 0. Email pipeline — LIVE ✅
- [x] Vercel `CRON_SECRET` set on **Production** (was mis-set to a Stripe key on
      Preview; corrected) → redeployed
- [x] **[me]** Fired all 4 preview emails — endpoint returned `{"ok":true,"sent":4}`
- [ ] Confirm `OWNER_EMAIL` resolves to `hello.whatsinmyfridge@gmail.com`
      (check which inbox the 4 previews landed in; if personal Gmail, change it)
- [ ] Verify a separate **`STRIPE_SECRET_KEY`** holds the `sk_live_…` value
      (it was briefly pasted into CRON_SECRET by mistake)
- [ ] Stripe → Settings → Business details / Customer emails → set public
      support email to `hello.whatsinmyfridge@gmail.com`

## 🛠️ 0b. Apply the review fixes to the database
- [x] **Full code review done** (HIGH→NIT across app, backend, site) — fixed,
      merged (PRs #82, #83) and deployed.
- [x] Ran `schema.sql` additions in Supabase: unique index on
      `stripe_customer_id` + `stripe_events` idempotency table.
- [x] Ran `maintenance.sql`: locked down `prune_old_data()` EXECUTE + scheduled
      the nightly prune (returned job id `1`).
- [ ] One oversized blog image left: **`site/blog/img/dinner-ideas.jpg` (562 KB)**
      — compress to ~120 KB (couldn't do it here: no image tooling in the env).

## 🔐 1. Security & passwords (~30 min)
- [ ] Get a **password manager** (Bitwarden, free) — stores passwords + 2FA backup codes
- [ ] Save the **new business Gmail's password** in Bitwarden
- [ ] Set a **unique, strong password** on each account below (change any reused ones)
- [ ] Turn on **2FA** (authenticator app or passkey, not SMS-only) and **save backup codes**:
  - Critical:
  - [ ] **hello.whatsinmyfridge@gmail.com** ← master key now, do first
  - [ ] **johnpbell7@gmail.com** (still recovery/login on several accounts)
  - [ ] **GitHub** · [ ] **Vercel** · [ ] **Stripe** · [ ] **Supabase** · [ ] **GoDaddy**
  - Important:
  - [ ] **Anthropic** · [ ] **Resend** · [ ] **Bitwarden itself**
  - When created: Monzo, Sentry, Cloudflare, HMRC Gateway, ICO

## ✅ 2. Verify & lock down Supabase (~10 min)
- [ ] Database → Tables: confirm **RLS enabled** on all 6 tables
      (`profiles`, `items`, `shopping_items`, `staple_prefs`, `saved_meals`, `ai_usage`)
- [ ] Auth → Settings: turn on **Leaked password protection** + **email confirmation**
- [ ] Settings → General: confirm project **region is EU**
- [ ] **Free-tier pause risk**: projects pause after ~1 week idle — keep active,
      or upgrade to Pro (~$25/mo) once there are users

## 📧 3. Email setup
- [x] Create the **business Gmail** (`hello.whatsinmyfridge@gmail.com`)
- [x] **[me]** Public contact links (site, app, privacy, terms) → business Gmail
- [x] **[me]** All outgoing app emails carry the Gmail as **reply-to**
      (from-address stays on the Resend-verified domain — required to send)
- [ ] Vercel `OWNER_EMAIL` + `CRON_SECRET` → see section 0
- [ ] Add the business Gmail to your **phone's Gmail app**
- [ ] *(optional)* GoDaddy forwarding `support@` → Gmail (no longer blocking)

## 🔍 4. Google / SEO
- [x] **[me]** Google verification file on the site
- [x] **Search Console** verified → **sitemap.xml submitted** (6 pages)
- [x] Property **re-homed to the business Gmail** (sole verified owner);
      vapesupplier owner removed, old token file deleted
- [ ] **Bing Webmaster Tools** → import from Search Console (sign in with the
      business Gmail — it owns the property now)

## ⚖️ 5. Legal / GDPR (~30 min)
- [ ] **Register with the ICO** (£40/yr data-protection fee) — ico.org.uk
- [x] **[me]** Added **Resend** to the privacy policy's processors list (also
      added an Anthropic US-transfer note) — merged & live.
- [ ] **Accept the DPA** in each: Supabase, Stripe, Resend, Vercel, Anthropic

## 💼 6. Business admin
- [ ] **HMRC sole-trader registration** (Self Assessment) — gov.uk, free, UTR by post
- [ ] **Business bank account** (Monzo Business Lite) → point Stripe payouts at it
- [ ] **Anthropic credit** — keep topped up (AI features stop at £0)
- [x] **Live payment test** with a real card (done 9 Jun — created the test sub below)

## 🧹 7. Cleanup (~5 min)
- [x] Stripe → test £3.99 sub (`johnbell_7@hotmail.com`) **cancelled** (ends
      9 Jul; no refund — by choice, access runs out at period end).
- [ ] Reset main account (`johnpbell7@gmail.com`) from test "plus" → free. SQL
      ready (run in Supabase SQL Editor):
      `update public.profiles set tier='free' where id in (select id from auth.users where email='johnpbell7@gmail.com');`

## 🟡 8. When you're ready (optional, not blocking)
- [x] **[me]** **Analytics** wired — Vercel Web Analytics + `signup` /
      `upgrade_started` / `subscribed` events. **Flip it on:** Vercel → Project →
      Analytics → Enable (free). Dormant until then.
- [x] **[me]** **Launch plan** written — see `LAUNCH.md` (channels + copy).
- [x] **[me]** **Report-only CSP** added to `vercel.json` (observes violations,
      blocks nothing — promote to enforcing once the reports look clean).
- [ ] Get **3–5 real people** using it → real feedback + real reviews for the site
- [ ] **[me]** Re-home the **trial-reminder email** to a free scheduler
      (needs a free cron-job.org account — point a daily GET at
      `/api/report` with the `CRON_SECRET` Bearer; I can document the exact setup)
- [ ] **Sentry** error monitoring (code wired, dormant until `VITE_SENTRY_DSN` set)
- [ ] **Trademark** (~£170–220, Classes 9 + 42) once there's traction
