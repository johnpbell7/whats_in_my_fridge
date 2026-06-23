# Finances — cost, profit & tax model (owner: employed on £44k)

A full back-of-envelope of what the app **costs to run**, the **profit** at each
scale, the **deductions** that lower the tax bill, and the **tax owed** given the
owner keeps a **£44,000 salaried job** and runs this as a sole trader on the side.

Companion to `BUSINESS.md` (per-user unit economics). Figures use **2025/26 UK
thresholds** (frozen into 2026/27) and the token-cost estimates in `BUSINESS.md`.

_Last updated: 2026-06-23. These are estimates — confirm tax specifics with an
accountant, and refine AI costs from the real Anthropic Usage figures._

---

## 1. Fixed costs (paid regardless of user count)

| Service | Free tier | Paid plan | Need paid when… |
|---|---|---|---|
| **Vercel** (hosting) | Hobby — free | Pro ~$20/mo (£16) | Commercial use / more bandwidth |
| **Supabase** (db/auth) | Free: 50k users, 500MB | Pro ~$25/mo (£20) | >500MB data or >50k monthly users |
| **Resend** (emails) | 3,000/mo free | ~$20/mo (£16) | >3k emails/month |
| **Domain** | — | ~£12/yr | Always |
| **Anthropic** (AI) | Pay-as-you-go | Variable | Per scan/chat (§2) |
| **Stripe** (payments) | — | 1.5% + 20p/charge | Per payment |

**Practical fixed cost:** ~£0–200/yr on free tiers (under ~100 subs), rising to
~£900–1,200/yr on Vercel Pro + Supabase Pro at scale.

## 2. Variable costs (per action)

| Operation | Model | Cost |
|---|---|---|
| Fridge scan (Plus) | Sonnet 4.6 | ~1.1p |
| Fridge scan (Free) | Haiku 4.5 | ~0.35p |
| Receipt scan | Haiku 4.5 | ~0.4p |
| Chat / meal idea | Haiku 4.5 | ~0.6p |

**Per paying subscriber, per year:**

- Revenue: £3.99 × 12 = **£47.88**
- − Stripe fees (~26p/mo): −£3.12 → **£44.76 net**
- − AI cost (typical user ~20p/mo): −£2.40
- − Free-user "drag" (~3 engaged free/trial users behind each paid one, ~£1.44 each): −£4.32
- = **≈ £38 net contribution per subscriber/year**

## 3. Revenue → profit at each scale

| Paying subs | Gross revenue/yr | All costs/yr | **Net profit/yr (pre-tax)** |
|---|---|---|---|
| 50 | £2,394 | ~£692 | **£1,702** |
| 100 | £4,788 | ~£1,184 | **£3,604** |
| 250 | £11,970 | ~£2,960 | **£9,010** |
| 500 | £23,940 | ~£5,820 | **£18,120** |
| 1,000 | £47,880 | ~£11,040 | **£36,840** |
| 2,000 | £95,760 | ~£21,480 | **£74,280** |

## 4. Deductions (lower taxable profit)

Everything in §1–§2 is an allowable expense (already netted above). On top:

- **Use of home as office** — simplified £6/week (£312/yr), or a % of bills
- **Equipment** — laptop, phone (Annual Investment Allowance)
- **Phone & internet** — business-use proportion
- **Software** — design tools / subscriptions used for the app
- **Marketing / ads** — anything spent on growth
- **Accountant's fees** — fully deductible

Treat the tax below as a **ceiling** — these reduce it further.

## 5. Tax — on a £44k salary

Salary already uses the **£12,570 personal allowance** and leaves only
**£6,270 headroom** before the 40% band (£50,270 − £44,000):

- First **£6,270** of app profit → **20%**
- Above £6,270 → **40%**
- **Class 4 NI (6%)** only on app profit **above £12,570** (2% above £50,270)
- **Class 2 NI** — effectively £0 (not required since April 2024)

| Paying subs | Profit | Income tax | Class 4 NI | Total tax | **Take-home/yr** | /mo |
|---|---|---|---|---|---|---|
| 50 | £1,702 | £340 | £0 | £340 | **£1,362** | £114 |
| 100 | £3,604 | £721 | £0 | £721 | **£2,883** | £240 |
| 250 | £9,010 | £2,350 | £0 | £2,350 | **£6,660** | £555 |
| 500 | £18,120 | £5,994 | £333 | £6,327 | **£11,793** | £983 |
| 1,000 | £36,840 | £13,482 | £1,456 | £14,938 | **£21,902** | £1,825 |
| 2,000 | £74,280 | ~£32,000\* | £2,742 | ~£34,700\* | **~£39,500\*** | ~£3,290 |

\* At 2,000 subs, total income (~£118k) crosses **£100k**, where the personal
allowance tapers — an effective **60% band** between £100k–£125k. Pension
contributions are the main lever to avoid it; get an accountant for this tier.

## 6. Key insight for a £44k earner

You exhaust the 20% headroom after just **~£6,270 of profit (~165 subscribers)**.
After that HMRC takes **46p of every extra £1** (40% tax + 6% NI):

- Each subscriber **under ~165 total** → you keep ~**£30/yr** of their £47.88
- Each subscriber **above ~165** → you keep ~**£20/yr**

Still very profitable — just know the second half of every milestone is taxed
hard, and pensions / staying-basic-rate maths are the levers to keep more.

## 7. The "keep your job" sweet spot

**250–500 paying subscribers ≈ £6,600–£11,800/yr take-home** (~£550–£980/mo
extra), costs well controlled, admin still a once-a-year Self Assessment. The
band where it's meaningful side income without the £100k-trap headaches.

## Admin checklist

- **Register for Self Assessment** once profit tops **£1,000/yr** (the trading
  allowance covers you below that).
- **Set aside ~30%** of profit for the tax bill — paid in a lump at Self
  Assessment, not at source like PAYE.
- Keep receipts for every expense in §1, §2 and §4.
- Day-job PAYE and NI are entirely separate and unaffected.

---

⚠️ Estimates only. AI token costs are modelled, not measured; the free-user drag
line is the most uncertain and can swing profit either way. Confirm UK tax
specifics with an accountant before relying on them.
