# Turning on accounts + usage limits

By default the app runs in **single-user "open" mode** — no login, and the AI
endpoints are unmetered. To offer it to other people (and stop anyone draining
your Anthropic credit), switch on **accounts**, which adds:

- email/password **sign-in**, with each person's fridge tied to their account;
- **per-user monthly limits** on photo scans and chat questions;
- **plans** (`free` / `plus`) that get different limits and vision models.

It's powered by [Supabase](https://supabase.com) (free tier is plenty to start).
Once the four environment variables below are set, the login screen and limits
turn on automatically. Leave them blank and nothing changes.

---

## Step 1 — Create a Supabase project

1. Sign up at <https://supabase.com> and **New project** (pick a region near you).
2. When it's ready, go to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ secret — server only, never in the browser)

## Step 2 — Create the tables

**SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and **Run**. This creates the `profiles` and `ai_usage` tables, the new-user trigger, and security policies.

## Step 3 — (Recommended for testing) ease the sign-up flow

**Authentication → Providers → Email**: for quick testing you can turn **off**
"Confirm email" so new accounts sign in immediately. For a real launch, leave it
on so people verify their address.

## Step 4 — Set the environment variables

**Locally** — in your `.env` file:

```
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**On Vercel** — add the same four under **Settings → Environment Variables**
(the two `VITE_` ones are public; keep the `SERVICE_ROLE` key private), then redeploy.

> The `SUPABASE_URL`/`VITE_SUPABASE_URL` pair is the same value — one is read by
> the server, the other is baked into the browser build.

## Step 5 — Run it

`npm run dev`, open the app, and you'll get the **sign-in screen**. Create an
account, and you're in. The avatar button (top-right of Inventory) shows your
plan and this month's usage.

---

## Plans & limits

Defined in [`server/auth.js`](./server/auth.js) (`TIERS`). Defaults:

| Plan | Vision model | Scans/month | Chats/month |
| ---- | ------------ | ----------- | ----------- |
| Free | Haiku (cheaper) | 5 | 15 |
| Plus | Sonnet (sharper) | 60 | 300 |

On top of the monthly caps, every signed-in user has a **daily rate-limit**
(`DAILY` in `server/auth.js`, default **20 scans / 40 chats a day**) so a script
can't burn a whole month's allowance in one burst. Normal use never hits it.

Tune these to your costs (see the pricing discussion). To upgrade a test account
to Plus, run in the SQL editor:

```sql
update public.profiles set tier = 'plus' where id = 'YOUR-USER-UUID';
```

(Find the UUID under **Authentication → Users**.) Hooking real **payments** up to
this `tier` column — so subscribing flips someone to `plus` automatically — is
the next milestone (RevenueCat for the app stores / Stripe for web).

---

## How it stays safe

- The **service-role key never reaches the browser** — only the server uses it.
- Every `/api/vision` and `/api/chat` call verifies the user's token, checks
  their quota **before** calling Claude, then records the usage.
- Row-level security means a signed-in user can only ever read their own rows.
