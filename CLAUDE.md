# Project notes for Claude

## Brand / logo standard (IMPORTANT — use going forward)
The logo is a **2-line stacked lockup**: italic sage `#5A8A72` "What's in my"
above deep-green `#276848` "Fridge" + a **two-tone leaf with a pale highlight
vein**. Two locked forms: **left-aligned** (website + app headers, footers,
emails, social — the default) and **centered** (app splash only, under the
fridge icon). White-out (#FFFFFF) version for dark/photo backgrounds.

- Full spec + canonical assets: `marketing/brand/BRAND.md`.
- App + website render it as **live text** (Fraunces) with the inline refined
  leaf; **emails** use the hosted PNG `${APP_BASE}/email-logo.png`.
- **Never** reintroduce the old single-line "What's in my Fridge." wordmark or
  the old flat leaf.
- **Do NOT change the PWA app icon** (home-screen fridge icon) — keep as-is.

## Deploy
Develop on the feature branch, then fast-forward `main` (Vercel deploys `main`
for both the app and the marketing site). Build: `npm run build`; tests:
`npm test` (keep green).
