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

---

## Running costs & billing (the AI bill)

Every photo scan and chat question calls Anthropic with **your** API key, so you
pay for the usage and recoup it through subscriptions. You don't have to top it
up by hand — set it up once to manage itself.

### 1. Turn on auto-reload (no manual topping up)
**Anthropic Console → Settings → Billing → Auto-reload.** Set "when my balance
drops below **£X**, charge my card **£Y**" (e.g. below £5 → add £20). It now
refills itself from your card indefinitely.

### 2. Put a safety ceiling on it
In the same Billing area set a **monthly spend limit** and **email alerts**
(e.g. alert at £20, cap at £50). If usage ever spikes, the API pauses until next
month instead of draining your card.

### 3. Glance at usage occasionally
The Console's **usage dashboard** shows daily/monthly cost. Check weekly early
on, then less as you trust it.

### How the money circulates
```
Subscribers pay £3.99  ->  Apple / Google / Stripe  ->  your bank
Your card (kept funded from that)  ->  Anthropic auto-reload  ->  AI usage
```
Subscription income lands in your bank; Anthropic quietly charges your card; you
keep the card funded from the income. The only manual task is keeping that card
valid.

### Why it's safe to leave on autopilot
Spend is **bounded by the app itself** — every user is metered (Free 10 scans /
30 chats a month, Plus 60 / 300, plus a daily guard of 20 / 40), and nothing
runs without a signed-in user. So the bill can only scale with real usage; it
can't spike randomly. Rough costs: a maxed-out **free** user ≈ **~12p/month**; a
maxed-out **Plus** user ≈ **~£2.25/month** in AI against their ~£2.54 net
subscription. Tune the limits in `server/auth.js` (`TIERS` + `DAILY`).

### As you grow
Once you're spending more, Anthropic offers **monthly invoicing** (pay-as-you-go
billed monthly instead of prepaid credits) — switch to that later and there's no
balance to think about at all.
