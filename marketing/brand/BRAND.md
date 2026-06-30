# Brand — logo standard (canonical, use everywhere)

The **What's in my Fridge** wordmark is a **2-line stacked lockup**:

```
What's in my      ← Fraunces, italic, weight 500, sage green #5A8A72
Fridge 🌿          ← Fraunces, weight 600, deep green #276848, + refined leaf
```

The **leaf** is a slender two-tone leaf with a pale highlight vein (NOT the old
flat blob). Body = leaf green `#7BB497` (or `currentColor` inline), highlight =
pale `#EAF4ED` / translucent white.

## Two locked forms
- **Left-aligned** — website header + footer, app header, emails, social posts,
  and anywhere the logo is featured by default.
- **Centered** — the app splash / loading animation (under the fridge icon).

## Colours
- Deep green `#276848` ("Fridge"), sage `#5A8A72` ("What's in my")
- Leaf `#7BB497`, highlight `#EAF4ED`
- White-out (`#FFFFFF`) version for dark/green/photographic backgrounds.

## Canonical assets (this folder)
- `wordmark-left.svg/.png`, `wordmark-left-white.svg/.png`
- `wordmark-centered.svg/.png`, `wordmark-centered-white.svg/.png`
- `whats-in-my-fridge-wordmark.png/.svg` (= left green, used by social scripts)
- `../../public/email-logo.png` (left green, served for emails)
- `../../public/logo.svg` and `../../site/logo.svg` (= left green lockup)

Regenerate from the app's Fraunces font with `scratchpad/logo2.py`.

## Where it's wired (live text vs image)
- **App** (`AppHeader.jsx`, `Splash.jsx`) and **website** (`site/*.html`,
  `blog.css`) render the lockup as **live text** (Fraunces) with the inline
  refined-leaf SVG — crisp, themeable, white-out via colour.
- **Emails** (`server/email.js`) use the hosted PNG `${APP_BASE}/email-logo.png`.

## Do NOT change
- The **PWA app icon** (home-screen fridge icon: `icon.svg`,
  `apple-touch-icon.png`, `icon-192/512`, maskable) — kept as-is by request.

> Going forward: any new logo usage uses THIS lockup (left-aligned by default,
> centered only for the splash). Never reintroduce the old single-line
> "What's in my Fridge." wordmark or the flat leaf.
