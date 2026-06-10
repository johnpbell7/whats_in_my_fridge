# ⏰ Daily email scheduler setup (5 minutes)

Your app sends two **automatic** emails:

- **Welcome** — to anyone who's signed up but not yet been welcomed.
- **Trial-ending reminder** — ~2 days before a new account's 7-day Plus trial
  ends, nudging them to subscribe. (This is the one that converts trials to
  paying customers, so it's worth turning on.)

The code lives in `server/notify.js` and works — it just needs a daily trigger.

## ✅ Now handled by Vercel Cron (no third party needed)
A `crons` entry in `vercel.json` points Vercel at `/api/report` once a day
(`0 9 * * *`). Vercel automatically sends the `CRON_SECRET` as a Bearer token on
these calls, which is exactly what the endpoint checks — so it works on the next
deploy, as long as `CRON_SECRET` is set in the project's env vars (it is).

Nothing else to do. Confirm it's live in Vercel → Project → **Settings → Cron
Jobs** after a deploy, where you can also trigger a manual run to test.

> The cron-job.org steps below are an **optional fallback** (e.g. if you ever
> move off Vercel). You don't need them now.

---

## What the scheduler calls

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `https://app.whatsinmyfridge.co.uk/api/report` |
| **Header** | `Authorization: Bearer <YOUR_CRON_SECRET>` |
| **Schedule** | once a day (e.g. 09:00) |

> `<YOUR_CRON_SECRET>` is the same value that's set in Vercel → Environment
> Variables → `CRON_SECRET` (also saved in Bitwarden). Don't paste the real
> value into any public place — it's the key that lets something send email as you.

The endpoint is **safe to call daily**: it only emails people who haven't been
welcomed yet, or whose trial is about to end, and it marks each so nobody is
emailed twice. A wrong/missing token just returns `401 unauthorized` and sends
nothing.

A successful run returns JSON like:
```json
{ "ok": true, "welcomed": 2, "reminded": 1 }
```

---

## Setup with cron-job.org (free)

1. Go to **https://cron-job.org** → sign up (free) → **Create cronjob**.
2. **Title:** `Fridge daily emails`
3. **URL:** `https://app.whatsinmyfridge.co.uk/api/report`
4. **Schedule:** Every day at a fixed time, e.g. **09:00**. (Set the timezone to
   your own so it's a sensible hour.)
5. Expand **Advanced / Headers** → add a request header:
   - **Name:** `Authorization`
   - **Value:** `Bearer <YOUR_CRON_SECRET>`  ← paste the real secret here
6. **Request method:** `GET`
7. **Save**. Then hit **"Run now"** once to test — it should report success
   (HTTP 200). If you see 401, the header/secret is wrong.

That's it. From then on the welcome + trial-reminder emails send themselves.

---

## Alternatives (if you prefer)
- **GitHub Actions** (free): a scheduled workflow with a single `curl` step,
  storing the secret in repo secrets. Tell Claude and it can write the workflow
  file for you.
- **Vercel Cron** (free, but counts as a function): once you're on Vercel Pro,
  or if you free up a function slot, you can add a `crons` entry in `vercel.json`
  pointing at `/api/report` instead of using an external service.

## How to verify it's working
- cron-job.org shows the last run's status + response on the job's page.
- A real run that actually sent mail returns `welcomed`/`reminded` counts > 0.
- The recipients' emails arrive from your verified domain with the business
  Gmail as reply-to (same pipeline as the live preview emails).
