# Launch checklist (live status)

Single source of truth for what's left. Updated 10 Jun 2026.
**Everything technical/code is done.** What remains is account/admin on your side.

---

## ✅ Done
- **App, backend, payments, AI, sync, PWA** — built and live.
- **Full code review** (HIGH→NIT) fixed, merged, deployed; **0 dependency vulns**.
- **Email pipeline live** — `CRON_SECRET` + `OWNER_EMAIL` (business Gmail) +
  `STRIPE_SECRET_KEY` (`sk_live`) all verified in Vercel; 4 preview emails sent.
- **Daily emails (welcome + trial reminder)** scheduled via **Vercel Cron** (no
  third party).
- **All contact/reply email** → `hello.whatsinmyfridge@gmail.com`; Resend added
  to the privacy policy.
- **Stripe** — live, business details + support email + statement descriptor set;
  test sub cancelled; main Gmail account reset to free.
- **Search Console** verified, sitemap submitted, property re-homed to business Gmail.
- **Analytics** (Vercel Web Analytics) enabled + conversion events wired.
- **Self-hosted fonts**, **report-only CSP**, **seasoning category + AI fridge/
  freezer/pantry filing**, **chat expiring-items selector**, **friendly AI-error
  message**, **compressed blog image**, **rebranded logo + app icon**.
- **DB migrations** applied (Stripe unique index, idempotency table, maintenance
  lockdown + nightly prune).
- **Business bank account** ✅ · **Trademark** ✅ · **Live payment test** ✅.
- Docs written: `LAUNCH.md`, `SOCIAL.md`, `SCHEDULER.md`.

---

## ⬜ Still to do — all your side, no code

### 🔐 Security (do before pushing for users — ~30 min)
- [ ] **Bitwarden** (free) + a **unique strong password** on every account
- [ ] **2FA** (authenticator/passkey, not SMS) + save backup codes — order:
      **`hello.whatsinmyfridge@gmail.com` first**, then `johnpbell7@gmail.com`,
      GitHub, Vercel, Stripe, Supabase, GoDaddy, Anthropic, Resend
- [ ] **Supabase**: confirm **RLS** on all 6 tables · turn on **leaked-password
      protection** + **email confirmation** · confirm **EU region**
- [ ] (awareness) Supabase free tier pauses after ~1 week idle — keep active or
      go Pro once you have users

### ⚖️ Legal
- [ ] **ICO registration** (£40/yr) — ico.org.uk
- [ ] **Accept the DPA** in Supabase, Stripe, Resend, Vercel, Anthropic
- [ ] **HMRC** — register as a sole trader (Self Assessment), gov.uk, free

### 💼 Ongoing
- [ ] Keep **Anthropic credit** topped up (AI stops at £0)

### 🟡 Optional / whenever
- [ ] Add the business Gmail to your **phone's Gmail app**
- [ ] **Bing Webmaster Tools** (sign in with business Gmail, import from Search Console)
- [ ] **Sentry** — paste `VITE_SENTRY_DSN` into Vercel for error monitoring
- [ ] Get **3–5 real people** using it → feedback + reviews
