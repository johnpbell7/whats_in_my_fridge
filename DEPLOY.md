# Putting Fridge online (free, ~10 minutes)

This hosts the app on **Vercel's free tier**. You get a permanent web address you
open on your phone and "Add to Home Screen" — no Mac needed afterwards, works
anywhere. The frontend and the small API (which holds your Claude key) both
deploy together. Your key is stored in Vercel's settings and is never sent to
the browser.

You only do this once. Updates later are a single `npx vercel --prod`.

---

## Step 1 — Get a Claude API key

1. Go to <https://console.anthropic.com/> and sign in.
2. **Billing** → add a little credit (£5 lasts a very long time — a photo scan is
   a few pence, a chat question a fraction of that).
3. **API Keys** → **Create Key** → copy it (starts with `sk-ant-...`). Keep it
   somewhere safe; you'll paste it in Step 4.

## Step 2 — Log in to Vercel

In Terminal, from this project folder:

```bash
cd "/Users/johnbell/Documents/Whats in my Fridge"
npx vercel login
```

Pick "Continue with GitHub" (or email) and approve in the browser. If it's a
fresh signup, that's fine — it's free.

## Step 3 — Deploy

```bash
npx vercel
```

Answer the prompts (the defaults are all correct — just press Enter):

- *Set up and deploy?* → **yes**
- *Which scope?* → your account
- *Link to existing project?* → **no**
- *Project name?* → `fridge` (or anything)
- *In which directory is your code?* → **`./`**
- *Modify settings?* → **no** (it auto-detects Vite)

It prints a URL when done. That's a preview — chat/scan won't work yet because
the key isn't set. One more step.

## Step 4 — Add your Claude key

```bash
npx vercel env add ANTHROPIC_API_KEY
```

- Paste your `sk-ant-...` key when asked for the value.
- For environment, select **Production** (press space, then Enter). Selecting all
  three (Production, Preview, Development) is fine too.

## Step 5 — Deploy for real

```bash
npx vercel --prod
```

This prints your **live URL**. Open it on your phone:

- **iPhone (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** menu (⋮) → **Add to Home screen / Install app**.

It now behaves like a normal app icon. Done.

---

## Updating it later

Change anything, then from the project folder:

```bash
npx vercel --prod
```

---

## Automatic deploys

This project's Vercel is **connected directly to the GitHub repo**, so every
push/merge to `main` deploys to your live URL automatically — and each pull
request gets its own **preview URL** to test on before merging. There's nothing
to run by hand.

You can still trigger a manual redeploy any time from the Vercel dashboard
(**Deployments → ··· → Redeploy**), and after changing environment variables
you should redeploy (untick "Use existing Build Cache") so the new values are
picked up.

## Good to know

- **Where your data lives:** your inventory is stored in your phone's browser
  (on-device). It's private and works offline, but it does *not* sync between
  devices, and clearing that browser's data clears the list. For one person on
  one phone, that's exactly what you want. If you later want it on multiple
  devices, that's the Supabase step in the README — ask and I'll wire it up.
- **Changing models / cost:** set `VISION_MODEL` or `CHAT_MODEL` as extra Vercel
  env vars (same as Step 4) to use cheaper/different models.
- **Checking the key is live:** visit `https://your-url/api/health` — it should
  show `"hasKey": true`.
