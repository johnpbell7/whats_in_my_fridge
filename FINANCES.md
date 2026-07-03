# Finances — cost, profit & tax model (owner: employed on £44k)

What the app **costs to run**, the **profit** at each scale, and the **tax owed**,
modelled by **total users with 5% subscribing** — and counting the cost of your
free users plus paid Supabase/Vercel.

Companion to `BUSINESS.md` (per-user unit economics). Figures use **2025/26 UK
thresholds** (frozen into 2026/27) and the token-cost estimates in `BUSINESS.md`.

_Last updated: 2026-07-03. Estimates — confirm tax with an accountant, and refine
AI costs from the real Anthropic Usage figures._

---

## 1. Fixed costs — the "paid bracket" (Supabase etc.)

| Service | Free tier | Paid plan | Annual (paid) | Status |
|---|---|---|---|---|
| **Supabase** | 50k users, 500MB | Pro ~$25/mo | **£240** | ✅ **PAYING (from Jul 2026)** |
| **Vercel** | Hobby | Pro ~$20/mo | **£192** | Free (Hobby) |
| **Domain** | — | ~£12/yr | **£12** | Paying |
| **Resend** | 3,000 emails/mo | ~$20/mo (over 3k) | **£192** (≥~5k users) | Free (under 3k) |
| **Total paid infra (modelled)** | | | **~£444/yr** (≥5k users ~£636) | |

**Actual spend right now (Jul 2026):** Supabase Pro **~$25/mo ≈ £20/mo (£240/yr)**
+ domain **~£12/yr** = **~£21/mo / ~£252/yr**. Vercel and Resend are still on their
free tiers, so they add £0 until you outgrow them (~50k users / 3k emails a month).

> Note: the free tiers cover you to ~50k users, so Supabase Pro isn't strictly
> required yet at your scale — but you've chosen to pay for it (headroom / no
> auto-pause). Treat **~£21/mo** as your current fixed overhead.

## 2. Per-user variable costs

| Operation | Model | Cost |
|---|---|---|
| Fridge scan (Plus) | Sonnet 4.6 | ~1.1p |
| Fridge scan (Free) | Haiku 4.5 | ~0.35p |
| Chat / meal idea | Haiku 4.5 | ~0.6p |

- **Per paying subscriber:** £47.88 charged − £3.12 Stripe − £2.40 AI = **~£42/yr** gross profit
- **Per free user:** **~£0.50/yr** in AI (the big swing factor — dormant users £0, heavy users up to the £2.58 cap)

## 3. Your question — 1,000 users at 5%

**1,000 users → 50 paying:**

| Line | Amount |
|---|---|
| Revenue (50 × £47.88) | **£2,394** |
| − Free-user AI (950 × £0.50) | −£475 |
| − Paid-user AI (50 × £2.40) | −£120 |
| − Stripe fees | −£156 |
| − Infra (Supabase + Vercel + domain) | −£444 |
| **= Net profit** | **£1,199** |
| − Income tax (20%) | −£240 |
| **= Take-home** | **≈ £960/yr (~£80/mo)** |

At this scale, your **950 free users (£475) and paid infra (£444)** eat most of
the revenue. That's the reality of 5% conversion — it gets much better at scale.

## 4. Take-home as you grow (5% subscribe)

| Total users | Paying (5%) | Net profit/yr | Tax + NI | **Take-home/yr** |
|---|---|---|---|---|
| 1,000 | 50 | £1,199 | £240 | **£960** |
| 2,000 | 100 | £2,842 | £568 | **£2,275** |
| 5,000 | 250 | £7,579 | £1,778 | **£5,800** |
| 10,000 | 500 | £15,794 | £5,257 | **£10,540** |
| 20,000 | 1,000 | £32,224 | £12,815 | **£19,410** |
| 40,000 | 2,000 | £65,084 | ~£29,200\* | **~£35,900\*** |

\* At 40k users, total income (~£109k) crosses **£100k**, where the personal
allowance tapers — an effective **60% band**. Pension contributions are the lever.

## 5. Tax — on your £44k salary

Salary uses your £12,570 personal allowance and leaves **£6,270 headroom** before
40%:

- First **£6,270** of app profit → **20%**
- Above £6,270 → **40%**
- **Class 4 NI (6%)** only on app profit **above £12,570** (2% above £50,270)
- **Class 2 NI** — effectively £0 since April 2024

After ~£6,270 of profit (~150 paying / ~3,000 users), every extra £1 is taxed at
**46%** (40% + 6% NI).

## 6. The key insight

At 5% conversion **95% of your users are free**, and their AI usage + your paid
infra are your biggest costs — not the paying users. The two levers that move
everything:

1. **Conversion rate** — 5% → 8% roughly doubles profit with the same costs.
2. **Free-tier limits / cost** — trimming free scans/chats, or how much each free
   user can burn, drops the dominant cost line.

## 7. Realistic "keep your job" target

**10,000 users (500 paying) ≈ £10,500/yr take-home (~£880/mo)** — meaningful side
income, admin still a once-a-year Self Assessment.

## Admin checklist

- **Register for Self Assessment** once profit tops **£1,000/yr**.
- **Set aside ~30%** of profit for the tax bill (paid in a lump, not at source).
- Keep receipts — infra, AI spend, Stripe fees and home-office costs are all
  deductible.
- Day-job PAYE and NI are separate and unaffected.

---

⚠️ Estimates only. The **free-user AI cost (~£0.50/yr each)** is the most
uncertain line and swings the whole model — refine it from real Anthropic Usage.
Confirm UK tax specifics with an accountant.
