-- ---------------------------------------------------------------------------
-- Fridge accounts schema. Run this once in your Supabase project:
--   Supabase dashboard -> SQL Editor -> paste -> Run.
-- It creates a profile (with a plan/tier) for every user and an AI-usage log
-- the server counts against monthly quotas.
-- ---------------------------------------------------------------------------

-- One row per user, holding their plan. Defaults to 'free'.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  tier       text not null default 'free',
  created_at timestamptz not null default now()
);

-- A row per successful AI call, so the server can meter usage per month.
create table if not exists public.ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('vision', 'chat')),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_time_idx
  on public.ai_usage (user_id, kind, created_at);

-- Give every new auth user a profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security: users can read only their own rows. All writes happen
-- from the server with the service-role key, which bypasses RLS.
alter table public.profiles enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "read own usage" on public.ai_usage;
create policy "read own usage" on public.ai_usage
  for select using (auth.uid() = user_id);

-- To make yourself a paid user for testing:
--   update public.profiles set tier = 'plus' where id = 'YOUR-USER-UUID';

-- ---------------------------------------------------------------------------
-- Cloud sync: per-user inventory, shopping list and staple preferences.
-- Each row is owned by a user; row-level security means a signed-in user can
-- only ever read/write their own. The browser talks to these directly with the
-- user's session (anon key + their JWT) — no server round-trip needed.
-- Run this block in the SQL Editor the same way as the rest of this file.
-- ---------------------------------------------------------------------------

create table if not exists public.items (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default '',
  category    text not null default 'other',
  quantity    numeric not null default 1,
  unit        text default '',
  location    text not null default 'fridge',
  added_date  timestamptz not null default now(),
  expiry_date date,
  status      text not null default 'active',
  source      text default 'manual',
  confidence  numeric,
  notes       text default '',
  updated_at  timestamptz not null default now()
);
create index if not exists items_user_idx on public.items (user_id);

create table if not exists public.shopping_items (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  quantity   numeric not null default 1,
  checked    boolean not null default false,
  added_date timestamptz not null default now()
);
create index if not exists shopping_user_idx on public.shopping_items (user_id);

create table if not exists public.staple_prefs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.items enable row level security;
alter table public.shopping_items enable row level security;
alter table public.staple_prefs enable row level security;

drop policy if exists "own items" on public.items;
create policy "own items" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own shopping" on public.shopping_items;
create policy "own shopping" on public.shopping_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own staple prefs" on public.staple_prefs;
create policy "own staple prefs" on public.staple_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
