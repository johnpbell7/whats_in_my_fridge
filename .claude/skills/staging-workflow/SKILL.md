---
name: staging-workflow
description: >-
  Website/app development and release workflow. Use for ANY build, change,
  feature, fix, deploy, launch, or release on a website or web app. Enforces a
  staging-first flow: build on a staging branch, review on a separate staging
  site before production, batch features and ship them together, never push to
  production without the user's explicit "launch", and always account for a
  separate Supabase staging database whenever a change touches the schema.
---

# Staging-first website / app workflow

Apply this to **every** feature, fix, or change on a website/web app.

> **Golden rule: nothing reaches production (`main`) until the user explicitly says "launch."**
> Build and review on staging first, every time.

## Environments
- **Production = `main` branch** → the live site/app. Only an explicit "launch" merges here.
- **Staging = the working branch** (this project: `claude/happy-mayer-hfjofo`) → served at a stable staging URL (this project: `staging.whatsinmyfridge.co.uk`, a Vercel branch domain). All in-progress work lands here first.

## The flow — do this every time
1. Build the change on the **staging branch** — never commit straight to `main`.
2. Run build + tests; never proceed red.
3. Push → it auto-deploys to the **staging site**.
4. Tell the user the **staging URL** and exactly what to review (and that they can test it on their phone).
5. Let features **accumulate on staging** so several can be built and reviewed together.
6. Only when the user says **"launch"**, merge staging → `main` → the whole batch ships at once.

This is the key behaviour: **do not auto-merge to `main`.** Hold on staging for sign-off.

## Backups — assume both
- **Code:** git history + Vercel **Instant Rollback** (promote a previous production deployment). Automatic; one click to revert.
- **Data:** lives in **Supabase, not in git.** Free tier has **no auto-backups** → recommend Supabase Pro (daily backups + point-in-time recovery) or regular manual exports *before real users rely on it*.

## Supabase: branching CODE does not branch the DATABASE
A staging branch/site still points at the **same database** as production by default (it's just env vars). So:
- **Frontend / UI changes** (no DB) → safe to stage on the shared database. (~90% of work.)
- **Database / schema changes** (new tables, columns, RLS policies, migrations) → land in **production the instant they're applied** to the shared DB, *before* any "launch", because the DB isn't staged with the code.
  - **ALWAYS flag a DB-touching change explicitly:** "heads-up — this one needs a Supabase change."
  - Prefer designs that avoid schema changes where reasonable (e.g. store new prefs on an existing synced JSON blob rather than a new table).
  - For true isolation, use a **second (free) Supabase project as staging** and point Vercel's **Preview** env vars at it; keep its schema in sync. (Supabase Branching is the paid, auto-per-branch version.)

## New-project setup checklist (Vercel + GitHub + Supabase + domain registrar)
- **Vercel:** Settings → Domains → add `staging.<domain>` and set its **Git Branch** to the staging branch.
- **Registrar DNS:** add a **CNAME** `staging` → the Vercel target.
- **Supabase:** Authentication → URL Configuration → add the staging URL to **Redirect URLs** (leave Site URL = production), so sign-in works on staging.
- **Note:** Stripe/checkout redirects use the production `APP_URL`, so **don't test payments on staging** — everything else reviews fine.

## Hotfix path (production is broken, urgent)
Branch off `main`, fix, merge straight to `main`, then fold the fix back into the staging branch.

## Costs to budget on this stack
- **Vercel Pro (~$20/mo)** once commercial (taking payments) — Hobby is non-commercial.
- **Supabase Pro (~$25/mo)** once you have real user data (backups + no auto-pausing).
- **GitHub** free tier is enough (unlimited repos).
