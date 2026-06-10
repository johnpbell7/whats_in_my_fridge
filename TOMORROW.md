# Launch checklist (live status)

Single source of truth for what's left. Items marked **[me]** are things
Claude does once you give the go-ahead. Updated 10 Jun 2026.

## ⚡ 0. Unblock the email pipeline (~10 min) — do first
- [ ] Vercel → Settings → Environment Variables → **add `CRON_SECRET`**
      (value: Bitwarden / chat — not committed here) → Production → Save
- [ ] Same screen → **`OWNER_EMAIL`**: still points at the personal Gmail, which
      overrides the code default → change to `hello.whatsinmyfridge@gmail.com`
      (or delete the var entirely) → **Redeploy**
- [ ] Stripe → Settings → Business details / Customer emails → set public
      support email to `hello.whatsinmyfridge@gmail.com`
- [ ] **[me]** Fire all 4 preview emails into the new gmail to confirm routing
      (blocked until `CRON_SECRET` is set — last test: `unauthorized`)

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
- [ ] **[me]** Add **Resend** to the privacy policy's processors list
      (currently names Supabase, Anthropic, Stripe, Vercel — Resend missing)
- [ ] **Accept the DPA** in each: Supabase, Stripe, Resend, Vercel, Anthropic

## 💼 6. Business admin
- [ ] **HMRC sole-trader registration** (Self Assessment) — gov.uk, free, UTR by post
- [ ] **Business bank account** (Monzo Business Lite) → point Stripe payouts at it
- [ ] **Anthropic credit** — keep topped up (AI features stop at £0)
- [x] **Live payment test** with a real card (done 9 Jun — created the test sub below)

## 🧹 7. Cleanup (~5 min)
- [ ] Stripe → **refund/cancel** the test £3.99 subscription (`johnbell_7@hotmail.com`)
- [ ] **[me]** 1-line SQL to reset main account (`johnpbell7@gmail.com`) from test "plus" → free

## 🟡 8. When you're ready (optional, not blocking)
- [ ] **[me]** Set up **analytics** (see signups + conversions)
- [ ] **[me]** Write the **launch plan** (channels + ready-to-post blurbs)
- [ ] Get **3–5 real people** using it → real feedback + real reviews for the site
- [ ] **[me]** Add a **report-only CSP** (deeper security hardening)
- [ ] **[me]** Re-home the **trial-reminder email** to a free scheduler
- [ ] **Sentry** error monitoring (code wired, dormant until DSN set)
- [ ] **Trademark** (~£170–220, Classes 9 + 42) once there's traction
