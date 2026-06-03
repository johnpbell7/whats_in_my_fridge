# Fridge

A phone-friendly PWA that tracks what's in your fridge. Manual tick-off and
expiry tracking are the reliable backbone; photo recognition is a fast-add
helper; an in-app chat answers "what's in my fridge?" while you're out.

Built from [`fridge-app-build-plan.md`](./fridge-app-build-plan.md) — Phase 1
(manual items, expiry, chat) plus Phase 2 photo & receipt recognition.

**Just want to use it on your phone?** See [`DEPLOY.md`](./DEPLOY.md) for a
~10-minute, free, one-time deploy to the web.

## Running it

```bash
npm install
npm run dev
```

That starts two things at once:

- the web app on **http://localhost:5173**
- a small API on **http://localhost:8787** that holds your Anthropic key

Open the web app on your phone (same Wi-Fi, use your computer's LAN IP) and
"Add to Home Screen" to install it.

### The inventory works immediately

Adding, editing, ticking items used, expiry sorting and the "use soon"
highlight all work with **no setup** — data is stored in your browser
(`localStorage`).

### Turning on chat + photo recognition

These two features call Claude, so they need an API key:

1. `cp .env.example .env`
2. Put your key from <https://console.anthropic.com/> in `ANTHROPIC_API_KEY`.
3. Restart `npm run dev`.

The key is read **only by the server** (`server/index.js`) and is never sent to
the browser. The browser only ever talks to `/api`. Until a key is set, the
chat and scan screens show a friendly setup message instead of failing.

## How it's put together

```
src/
  lib/store.js        inventory data layer (localStorage; swap for Supabase here)
  lib/api.js          browser → /api client (never touches Anthropic directly)
  lib/image.js        downscales photos before upload (faster, cheaper, smaller)
  lib/categories.js   categories + default shelf-life estimates
  lib/expiry.js       "use by" maths, sorting, highlighting
  components/         InventoryScreen, ItemForm, ScanScreen, ChatScreen, ...
server/core.js        the actual Claude calls (vision + chat), shared
server/index.js       local dev Express wrapper around core.js (holds the key)
api/*.js              same handlers as Vercel serverless functions (production)
```

The Claude logic lives once in `server/core.js`. Locally it runs behind Express
(`server/index.js`); in production the `api/*.js` files expose it as Vercel
serverless functions. Either way the key stays server-side.

### Moving to Supabase later

The whole app reads/writes through `src/lib/store.js`. To move off the browser
and onto Supabase (for sync across devices), reimplement that file's
`getAll / add / addMany / update / remove` against a Postgres `items` table and
keep the `subscribe()` callback firing on changes — no components need to
change. The `server/` routes can move to a Supabase Edge Function unchanged.

## Notes

- App icons are SVG (crisp in the browser and on Android install). iOS
  home-screen icons look best from a PNG — drop a 180×180 `apple-touch-icon.png`
  in `public/` and point the `<link rel="apple-touch-icon">` at it if you want.
- Models are configurable in `.env` (`VISION_MODEL`, `CHAT_MODEL`).
