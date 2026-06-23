# Unit economics — What's in my Fridge

A back-of-envelope model of how profitable each user is, so you can sanity-check
pricing and limits as you grow. **The token counts below are estimates** — treat
them as a starting frame and refine with the real numbers from your
Anthropic Console (Usage) once you have traffic. The *structure* is what matters:
the per-user caps are deliberately set so a Plus subscriber can never cost more
than they pay.

_Last updated: 2026-06-06. Update the rates if Anthropic or Stripe change pricing._

## Inputs (the knobs)

| Thing | Value | Where it's set |
|---|---|---|
| Plus price | **£3.99 / month** | Stripe + landing copy |
| Stripe fee (UK card) | ~1.5% + 20p ≈ **26p** | stripe.com/gb/pricing |
| **Net revenue per Plus user** | **≈ £3.73 / month** | (after Stripe) |
| FX assumption | **$1 ≈ £0.79** (i.e. £1 ≈ $1.27) | update to spot rate |

### Per-tier AI limits (`server/auth.js`)

| | Free | Plus |
|---|---|---|
| Photo/receipt scans | 10 / mo | 60 / mo |
| AI chat questions | 30 / mo | 200 / mo |
| Daily anti-abuse cap | 20 scans + 40 chats | 20 scans + 40 chats |
| Vision model (fridge photos) | Haiku 4.5 | **Sonnet 4.6** |
| Receipts & chat model | Haiku 4.5 | Haiku 4.5 |

### Model rates (per 1M tokens)

| Model | Input | Output |
|---|---|---|
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Haiku 4.5 | $1.00 | $5.00 |

## Estimated cost per operation

Rough token estimates per call (image + prompt in, item/answer JSON out):

| Operation | Model | ~Input tok | ~Output tok | **≈ cost** |
|---|---|---|---|---|
| Fridge photo scan (Plus) | Sonnet 4.6 | 2,000 | 500 | **$0.014** (~1.4¢ / ~1.1p) |
| Fridge photo scan (Free) | Haiku 4.5 | 2,000 | 500 | **$0.0045** (~0.45¢ / ~0.35p) |
| Receipt scan (any tier) | Haiku 4.5 | 2,100 | 400 | **$0.0041** (~0.4¢) |
| Chat / meal idea | Haiku 4.5 | 3,500 | 800 | **$0.0075** (~0.75¢ / ~0.6p) |

> Chat input is dominated by your inventory (each item ≈ 20 tokens). A 150-item
> fridge ≈ 3,000 tokens of context per question — the main cost driver for chat.

## What a user costs you

**Plus subscriber, maxing out every cap (worst case):**

- 60 Sonnet scans × $0.014 = **$0.84**
- 200 Haiku chats × $0.0075 = **$1.50**
- **≈ $2.34 / month ≈ £1.85**

Net revenue is **£3.73**, so even a power user who burns every credit leaves you
**≈ £1.88 margin**. A *typical* user (say 8 scans + 25 chats) costs **~£0.20/mo** —
margin ~£3.53.

**Free user, maxing out:**

- 10 Haiku scans × $0.0045 = $0.045
- 30 chats × $0.0075 = $0.225
- **≈ $0.27 / month ≈ £0.21**, against £0 revenue.

So your free tier costs **at most ~20p per active user per month** — that's your
effective "marketing spend" to acquire someone who might convert.

## Break-even (why the caps matter)

A Plus user only stops being profitable if their AI cost exceeds their **£3.73**
net revenue (≈ $4.74). At current rates that would take:

- **~340 Sonnet scans**, or
- **~630 chat questions**

…in a single month. Both are **far above** the 60-scan / 200-chat caps. **The
limits guarantee every Plus subscriber is profitable** — by design, they
physically can't cost more than they pay. That's the whole point of the metering
in `server/auth.js`.

## Levers if the maths ever changes

- **Cost too high?** Lower the Plus scan/chat caps, or move Plus vision from
  Sonnet → Haiku (≈3× cheaper on vision) and reserve Sonnet for harder photos.
- **Want more margin?** Raise the price, or add a higher tier.
- **Free tier too expensive at scale?** Trim free scans/chats, or shorten the
  14-day Plus trial.
- **Cut chat cost specifically:** the inventory sent with each question is the
  big input cost — trimming what's sent (e.g. names + categories only) helps.

## Get the real numbers

These are estimates. For actuals:

- **AI cost:** Anthropic Console → **Usage / Cost** (per-model token spend).
  Divide by your scan/chat counts (from the `ai_usage` table) for true cost-per-op.
- **Stripe fees & payouts:** Stripe Dashboard → **Balance / Payouts** (exact fee
  per charge, in your currency).
- **Usage distribution:** query `ai_usage` in Supabase to see how many
  scans/chats real users actually make — almost certainly far below the caps.
