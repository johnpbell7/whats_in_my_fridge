# Tomorrow's checklist

Outstanding tasks to get fully launch-ready. Items marked **[me]** are things
Claude does once you give the go-ahead. Suggested order is top to bottom
(~1.5–2 hours total).

## 🔐 1. Security & passwords (~30 min) — do first
- [ ] Get a **password manager** (Bitwarden, free) — stores passwords + 2FA backup codes
- [ ] Set a **unique, strong password** on each account below (change any reused ones)
- [ ] Turn on **2FA** (authenticator app or passkey, not SMS-only) and **save backup codes**:
  - [ ] **Gmail** (personal — and the new business one once created) ← master key, do first
  - [ ] **Vercel**
  - [ ] **Stripe**
  - [ ] **Supabase**
  - [ ] **GitHub**
  - [ ] **GoDaddy**
  - [ ] **Anthropic**

## ✅ 2. Verify & lock down Supabase (~10 min)
- [ ] Database → Tables: confirm **RLS enabled** on all 6 tables
      (`profiles`, `items`, `shopping_items`, `staple_prefs`, `saved_meals`, `ai_usage`)
- [ ] Auth → Settings: turn on **Leaked password protection** + **email confirmation**
- [ ] Settings → General: confirm project **region is EU**

## 📧 3. Finish the email setup (~15 min)
- [ ] Create the **business Gmail** → give Claude the address
- [ ] Vercel → set **`OWNER_EMAIL`** (new Gmail) + **`CRON_SECRET`** → **Redeploy**
      - CRON_SECRET value: `36241f02679f3fb8d7cedc68e3116a63c4383c0a43c34434`
- [ ] Add the business Gmail to your **phone's Gmail app**
- [ ] **[me]** Fire all 4 preview emails to confirm routing

## 🔍 4. Google / SEO — get indexed (~15 min)
- [ ] **[me]** Add the Google verification tag to the site
- [ ] **Google Search Console** → add `whatsinmyfridge.co.uk` → verify → **submit `sitemap.xml`**
- [ ] **Bing Webmaster Tools** → same (covers Bing + ChatGPT search)

## ⚖️ 5. Legal / GDPR (~30 min)
- [ ] **Register with the ICO** (£40/yr data-protection fee) — ico.org.uk
- [ ] Check **privacy policy names all processors**: Supabase, Anthropic, Stripe, Resend, Vercel
- [ ] **Accept the DPA** in each (Supabase, Stripe, Resend, Vercel, Anthropic)

## 🧹 6. Cleanup (~5 min)
- [ ] Stripe → **refund/cancel** the test £3.99 subscription (`johnbell_7@hotmail.com`)
- [ ] **[me]** 1-line SQL to reset main account (`johnpbell7@gmail.com`) from test "plus" → free

## 🟡 7. When you're ready (optional, not blocking)
- [ ] **[me]** Set up **analytics** (see signups + conversions)
- [ ] **[me]** Write the **launch plan** (channels + ready-to-post blurbs)
- [ ] Get **3–5 real people** using it → real feedback + real reviews for the site
- [ ] **[me]** Add a **report-only CSP** (deeper security hardening)
- [ ] **[me]** Re-home the **trial-reminder email** to a free scheduler
