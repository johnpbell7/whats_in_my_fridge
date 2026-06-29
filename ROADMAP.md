# Roadmap — future features (not building yet)

A parking place for features we want to bring in later, with enough design
thinking that we can pick them up cleanly when the time comes. Nothing here is
committed or scheduled — it's the "good ideas, not yet" list.

---

## 1. Calorie-goal meal planning ("Plan around your goal")

**Status:** idea / parked — revisit after the basic per-serving calorie estimate
(shipped) has been live a while and we've seen how people use it.

**Owner's pitch (verbatim intent):** a calorie-aware meal-prep mode — prep your
meals from what you've already got, against a daily calorie goal. Plan the day's
meals, build them around a target (e.g. a deficit), and get flagged when you're
going over.

### The one-line vision
> Turn "what's in my fridge?" into "what should I eat today to hit my goal — using
> what I've already got?"

This is the natural next rung after the rough per-serving estimate: from *showing*
calories to *planning* around them.

### Why it's a strong fit
- We already know the user's **fridge contents** (so plans use what they have — no extra shopping, less waste — which is the whole brand promise).
- We already **generate recipes with scaled quantities** and now an **estimated kcal/serving**, so the raw material for a day-plan exists.
- It's a clear, premium reason to be **Plus** — planning + tracking is worth paying for, while the free dinner-from-a-photo hook is untouched.

### Proposed design

**A. Set a daily goal (one-time, editable)**
- A simple onboarding in the account/diet area: pick a daily calorie target.
- Two ways in:
  - **"I know my number"** → type a kcal goal.
  - **"Help me work it out"** → a light estimate from age / sex / height / weight / activity / goal (lose / maintain / gain). Use a standard Mifflin-St Jeor BMR × activity factor, then apply a sensible deficit/surplus.
- ⚠️ **Health framing is critical** (see Safety below): present the number as a *rough starting point*, never medical advice, with a floor (don't suggest dangerously low targets) and a "talk to a professional" line.

**B. The day plan ("Today's plan")**
- A new view: a day with **Breakfast / Lunch / Dinner / Snacks** slots and a
  **running total vs goal** bar at the top (e.g. "1,180 / 1,800 kcal · 620 left").
- For each slot, **"Suggest from my fridge"** asks the AI for a meal that:
  - uses what's in the fridge (existing meal-suggestion logic),
  - fits the **remaining** calorie budget for the day,
  - respects diet/allergens/staples (already supported).
- Tapping a suggestion adds it to the slot and updates the running total.
- Manual add: log something you ate that wasn't a suggestion (rough kcal, AI can
  estimate from a short description — same engine as recipes).

**C. Build around the goal (the clever bit)**
- "Plan my day" — one tap generates a **whole day** of meals from the fridge that
  lands near the goal (e.g. 3 meals + 1 snack summing to ~goal). The AI is given
  the inventory + remaining budget + meal count and returns a balanced set.
- Each planned meal keeps its **how-to** and **calorie estimate** (reuse the
  existing method generation + cache — no new cost per re-open).

**D. Flagging / nudges**
- Live **over/under** state on the day bar: green within range, amber approaching,
  red over.
- Gentle, non-judgemental copy ("That'd take you ~150 over — want a lighter
  swap?") with a **one-tap "lighter alternative"** that re-asks the AI for a
  lower-calorie meal from the same fridge. Never shaming, never clinical.
- Optional end-of-day summary: "You came in ~120 under today."

**E. Meal prep angle**
- A **"prep ahead"** toggle: plan several days at once, batch the shared
  ingredients into the **shopping list** (we already have the list + dedup), and
  show which planned meals reuse the same components (cook once, eat twice).

### How it integrates with what exists
- **Inventory** (`store.js`) → the ingredient source for every suggestion.
- **Meal suggestion + method** (`server/core.js`) → extended with a
  `calorieBudget` input so suggestions can target a remaining number; method
  already returns `caloriesPerServing`.
- **Diet/staples/allergens** (`staples.js`) → already threaded into prompts; the
  goal + plan live alongside `diet` in the same store.
- **Shopping list** (`shopping.js`) → receives batched prep ingredients.
- **New store:** `plan.js` (IndexedDB/localStorage) holding the daily goal + the
  per-day plan (date → slots → meals + logged items). Mirrors the existing store
  pattern so it syncs/caches the same way.
- **New screen:** "Plan" (or fold into Meals as a tab). Mostly reuses existing
  meal-card + method-sheet components.
- **AI cost:** a "plan my day" is a few suggestion calls — meter it under the
  existing chat quota; cache aggressively (a generated plan/method is reusable so
  re-viewing never re-charges, same as today).

### Safety & legal (must-haves before build)
- This crosses from "rough guide" into **weight-management territory**, which is
  more sensitive. Required:
  - Clear, repeated **"estimate / general wellbeing, not medical or dietary
    advice"** framing; signpost to a GP/dietitian.
  - A **minimum-calorie floor** — never generate or accept dangerously low daily
    goals; show a safety message instead.
  - **No eating-disorder risk patterns** — avoid aggressive deficit nudging,
    avoid "punishment" language, consider a soft cap on how low a goal can be set
    and a supportive signpost (e.g. Beat helpline) if a very low goal is entered.
  - Update **Terms** and the in-app health disclaimers to cover calorie *goals*
    and *planning*, not just per-recipe estimates.
  - Keep calorie maths transparent ("estimate", ranges) — never imply precision.
- Worth a quick solicitor check given it edges toward health guidance.

### Rough build phases (when we pick it up)
1. **Goal-setting + day log** (set a goal, manually log meals, running total). No
   AI planning yet — proves the tracking UX and the safety framing.
2. **Budget-aware suggestions** (each slot suggests a fridge meal that fits the
   remaining budget). Reuses existing engine + the new `calorieBudget` input.
3. **"Plan my day"** (whole-day generation around the goal) + over/under flags +
   lighter-swap.
4. **Meal-prep / multi-day** (batch to shopping list, reuse-component view).

### Open questions to settle later
- Default to a **range** rather than a hard number, to soften the diet feel?
- How much manual logging do we support vs keeping it suggestion-led (simpler,
  more on-brand, less like MyFitnessPal)?
- Macros too, or strictly calories (calories alone is safer and simpler — lean
  that way unless there's demand)?

---

_Add new parked ideas below as their own section._
