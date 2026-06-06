-- ---------------------------------------------------------------------------
-- Automatic housekeeping for the fridge database.
--
-- Run this ONCE in your Supabase project:
--   Supabase dashboard -> SQL Editor -> paste -> Run.
--
-- It schedules a nightly pg_cron job that keeps the only ever-growing data
-- tidy, so the database never bloats no matter how many users you get:
--   * ai_usage  — one row per AI call, used only to meter the current month's
--                 quota. Anything older than ~2 months is dead weight.
--   * items     — soft-deleted rows (tombstones) keep deletions in sync across
--                 devices; once they're months old, every device has caught up.
--
-- It is idempotent — safe to run again (it replaces the existing job).
-- ---------------------------------------------------------------------------

-- pg_cron schedules jobs from inside Postgres. (Already available on Supabase;
-- this just turns it on if it isn't.)
create extension if not exists pg_cron;

-- The actual cleanup. SECURITY DEFINER so the scheduled job can delete rows
-- regardless of who it runs as. Tune the windows if you ever want to keep more.
create or replace function public.prune_old_data()
returns void
language sql
security definer
set search_path = public
as $$
  -- usage older than ~2 months is past every quota window we read
  delete from public.ai_usage
   where created_at < now() - interval '70 days';

  -- deletion tombstones older than ~3 months: every device has long since synced
  delete from public.items
   where deleted_at is not null
     and deleted_at < now() - interval '90 days';
$$;

-- Replace any previous version of the job, then (re)schedule it for 03:17 UTC
-- daily — a quiet hour, and an odd minute so it doesn't collide with other jobs.
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'fridge_nightly_prune';
exception when others then
  -- no existing job (or cron schema not ready yet) — nothing to remove
  null;
end $$;

select cron.schedule(
  'fridge_nightly_prune',
  '17 3 * * *',
  $$select public.prune_old_data()$$
);

-- ---------------------------------------------------------------------------
-- Handy checks (run any time):
--   -- see the scheduled job
--   select jobname, schedule, command, active from cron.job;
--   -- see recent runs (success/failure)
--   select jobid, status, start_time, end_time
--     from cron.job_run_details order by start_time desc limit 10;
--   -- run the cleanup once by hand, right now
--   select public.prune_old_data();
-- ---------------------------------------------------------------------------
