-- ACTORVERSE — Supabase schema (Phase 1)
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- It creates the three Phase 1 tables and turns on Row Level Security so
-- every user can only read and write their own rows.

-- ---------------------------------------------------------------------------
-- profiles: one row per user, linked to Supabase Auth (auth.users).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sessions: one row per finished practice-timer session.
-- kind is 'timer' in Phase 1 (other kinds may be added later).
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_title text not null,
  department text not null,
  kind text not null default 'timer',
  minutes integer not null check (minutes > 0),
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_created_at_idx
  on public.sessions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- weekly_goals: one row per user, the target practice minutes per week.
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  minutes_per_week integer not null default 150 check (minutes_per_week >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: users can only read/write their own rows.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.weekly_goals enable row level security;

-- profiles
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- sessions
drop policy if exists "Users can view their own sessions" on public.sessions;
create policy "Users can view their own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own sessions" on public.sessions;
create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own sessions" on public.sessions;
create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- weekly_goals
drop policy if exists "Users can view their own weekly goal" on public.weekly_goals;
create policy "Users can view their own weekly goal"
  on public.weekly_goals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own weekly goal" on public.weekly_goals;
create policy "Users can insert their own weekly goal"
  on public.weekly_goals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own weekly goal" on public.weekly_goals;
create policy "Users can update their own weekly goal"
  on public.weekly_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
