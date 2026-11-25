-- ACTORVERSE — Supabase schema (Phases 1–5)
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- It creates all eleven tables and turns on Row Level Security so
-- every user can only read and write their own rows (admins get an extra
-- read-only view for the dashboard — see the Phase 5 section).

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

-- ---------------------------------------------------------------------------
-- Phase 2 — recordings: one row per saved video take (Teleprompter / Studio).
-- The video file itself lives in the private `recordings` Storage bucket
-- (see supabase/storage-recordings-bucket.sql); this table only stores the
-- path to it. RLS keeps every take private to its owner.
-- ---------------------------------------------------------------------------
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled take',
  storage_path text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists recordings_user_id_created_at_idx
  on public.recordings (user_id, created_at desc);

alter table public.recordings enable row level security;

drop policy if exists "Users can view their own recordings" on public.recordings;
create policy "Users can view their own recordings"
  on public.recordings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own recordings" on public.recordings;
create policy "Users can insert their own recordings"
  on public.recordings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own recordings" on public.recordings;
create policy "Users can delete their own recordings"
  on public.recordings for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Table grants: RLS policies alone do not grant access — the anon and
-- authenticated roles also need these grants (missing them broke Phase 1).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.sessions to anon, authenticated;
grant select, insert, update, delete on public.weekly_goals to anon, authenticated;
grant select, insert, delete on public.recordings to anon, authenticated;

-- ===========================================================================
-- Appended from migrations/0007_scripts.sql (see that file for the standalone version).
-- ===========================================================================
-- ACTORVERSE — Phase 3 migration: scripts table (Script Vault)
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- (Running the full supabase/schema.sql again does the same thing.)
-- Creates the scripts table for the Script Vault, with Row Level Security
-- (own rows only) and the table grants the app needs.
-- The PDF files themselves live in the private `scripts` Storage bucket
-- — create it with supabase/storage-scripts-bucket.sql.
-- script_text is the optional pasted text of the script, used to send it
-- to the Teleprompter. It may be empty.

create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  storage_path text not null,
  script_text text,
  created_at timestamptz not null default now()
);

create index if not exists scripts_user_id_created_at_idx
  on public.scripts (user_id, created_at desc);

alter table public.scripts enable row level security;

drop policy if exists "Users can view their own scripts" on public.scripts;
create policy "Users can view their own scripts"
  on public.scripts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own scripts" on public.scripts;
create policy "Users can insert their own scripts"
  on public.scripts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own scripts" on public.scripts;
create policy "Users can update their own scripts"
  on public.scripts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own scripts" on public.scripts;
create policy "Users can delete their own scripts"
  on public.scripts for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.scripts to anon, authenticated;

-- ===========================================================================
-- Appended from migrations/0008_enrollments.sql (see that file for the standalone version).
-- ===========================================================================
-- ACTORVERSE — Phase 3 migration: enrollments table (Training Plans)
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- (Running the full supabase/schema.sql again does the same thing.)
-- One row per plan enrolment. plan_id is one of the 7 built-in plan ids or
-- 'custom' for a plan the user built themselves (details in custom_details
-- as JSON: department, minutesPerDay, weeks). A user can only enrol once
-- in the same built-in plan. All plans are free — enrolment costs Rs 0.

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  plan_title text not null,
  custom_details text,
  created_at timestamptz not null default now(),
  unique (user_id, plan_id)
);

create index if not exists enrollments_user_id_created_at_idx
  on public.enrollments (user_id, created_at desc);

alter table public.enrollments enable row level security;

drop policy if exists "Users can view their own enrolments" on public.enrollments;
create policy "Users can view their own enrolments"
  on public.enrollments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own enrolments" on public.enrollments;
create policy "Users can insert their own enrolments"
  on public.enrollments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own enrolments" on public.enrollments;
create policy "Users can delete their own enrolments"
  on public.enrollments for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.enrollments to anon, authenticated;

-- ===========================================================================
-- Appended from migrations/0009_posts.sql (see that file for the standalone version).
-- ===========================================================================
-- ACTORVERSE — Phase 4 migration: posts table (Community)
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- (Running the full supabase/schema.sql again does the same thing.)
-- Short community posts (max 500 characters, enforced in the app). Every
-- signed-in user can read all posts; a user can only write and delete
-- their own. The board starts empty — no fake posts.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "Signed-in users can view posts" on public.posts;
create policy "Signed-in users can view posts"
  on public.posts for select
  to authenticated
  using (true);

drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.posts to anon, authenticated;

-- ===========================================================================
-- Appended from migrations/0010_auditions.sql (see that file for the standalone version).
-- ===========================================================================
-- ACTORVERSE — Phase 4 migration: auditions + applications (Audition Center)
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- (Running the full supabase/schema.sql again does the same thing.)
-- Audition listings anyone signed in can post; applications are one per
-- user per audition. An applicant can only see their own applications;
-- the audition owner can also read the applications on their own listing.
-- Starts empty — no fake auditions.

create table if not exists public.auditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  role_description text not null,
  location text not null default 'Not given',
  deadline date,
  created_at timestamptz not null default now()
);

create index if not exists auditions_created_at_idx
  on public.auditions (created_at desc);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  audition_id uuid not null references public.auditions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  unique (audition_id, user_id)
);

create index if not exists applications_audition_id_idx
  on public.applications (audition_id, created_at desc);

alter table public.auditions enable row level security;
alter table public.applications enable row level security;

-- auditions
drop policy if exists "Signed-in users can view auditions" on public.auditions;
create policy "Signed-in users can view auditions"
  on public.auditions for select
  to authenticated
  using (true);

drop policy if exists "Users can insert their own auditions" on public.auditions;
create policy "Users can insert their own auditions"
  on public.auditions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own auditions" on public.auditions;
create policy "Users can delete their own auditions"
  on public.auditions for delete
  using (auth.uid() = user_id);

-- applications
drop policy if exists "Users can view applications on their auditions" on public.applications;
create policy "Users can view applications on their auditions"
  on public.applications for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.auditions a
      where a.id = audition_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert their own applications" on public.applications;
create policy "Users can insert their own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

grant select, insert, delete on public.auditions to anon, authenticated;
grant select, insert on public.applications to anon, authenticated;

-- ===========================================================================
-- Appended from migrations/0011_admin.sql (see that file for the standalone version).
-- ===========================================================================
-- ACTORVERSE — Phase 5 migration: admin roles + app settings (Admin Panel)
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- (Running the full supabase/schema.sql again does the same thing.)
--
-- admin_roles: one row per admin. Roles: Super Admin, Content Manager,
-- Support Manager, Moderator.
-- app_settings: simple key/value settings. Free Mode is ON by default
-- (free_mode = 'true'), Pro Rs 12,000/year, Premium Rs 24,000/year.
-- There is NO payment gateway: these are display settings only.
--
-- Bootstrap: the FIRST Super Admin is claimed when the table is empty —
-- the insert policy allows it only while no admin exists at all. After
-- that, only a Super Admin can add or change roles. Removing the last
-- Super Admin is blocked in the app.

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('Super Admin', 'Content Manager', 'Support Manager', 'Moderator')),
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;
alter table public.app_settings enable row level security;

-- Helper: true when the signed-in user is a Super Admin. SECURITY DEFINER
-- so it can read admin_roles even when the caller's own policies would
-- hide the rows.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = auth.uid() and role = 'Super Admin'
  );
$$;

-- admin_roles policies
drop policy if exists "Signed-in users can view admin roles" on public.admin_roles;
create policy "Signed-in users can view admin roles"
  on public.admin_roles for select
  to authenticated
  using (true);

drop policy if exists "First admin can be claimed, then only Super Admins" on public.admin_roles;
create policy "First admin can be claimed, then only Super Admins"
  on public.admin_roles for insert
  with check (
    not exists (select 1 from public.admin_roles)
    or public.is_super_admin()
  );

drop policy if exists "Only Super Admins can change roles" on public.admin_roles;
create policy "Only Super Admins can change roles"
  on public.admin_roles for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Only Super Admins can remove roles" on public.admin_roles;
create policy "Only Super Admins can remove roles"
  on public.admin_roles for delete
  using (public.is_super_admin());

-- app_settings policies: anyone can read the settings (prices and Free
-- Mode are shown on public pages); only a Super Admin can change them.
drop policy if exists "Anyone can view app settings" on public.app_settings;
create policy "Anyone can view app settings"
  on public.app_settings for select
  using (true);

drop policy if exists "Only Super Admins can change settings" on public.app_settings;
create policy "Only Super Admins can change settings"
  on public.app_settings for insert
  with check (public.is_super_admin());

drop policy if exists "Only Super Admins can update settings" on public.app_settings;
create policy "Only Super Admins can update settings"
  on public.app_settings for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Super Admins can read all user data for the admin dashboard counts.
-- (Every table already has its own own-rows-only policies; these ADD the
-- admin view on top — they do not replace the user policies.)
drop policy if exists "Super Admins can view all profiles" on public.profiles;
create policy "Super Admins can view all profiles"
  on public.profiles for select
  using (public.is_super_admin());

drop policy if exists "Super Admins can view all sessions" on public.sessions;
create policy "Super Admins can view all sessions"
  on public.sessions for select
  using (public.is_super_admin());

drop policy if exists "Super Admins can view all recordings" on public.recordings;
create policy "Super Admins can view all recordings"
  on public.recordings for select
  using (public.is_super_admin());

drop policy if exists "Super Admins can view all scripts" on public.scripts;
create policy "Super Admins can view all scripts"
  on public.scripts for select
  using (public.is_super_admin());

drop policy if exists "Super Admins can view all enrolments" on public.enrollments;
create policy "Super Admins can view all enrolments"
  on public.enrollments for select
  using (public.is_super_admin());

drop policy if exists "Super Admins can view all posts" on public.posts;
create policy "Super Admins can view all posts"
  on public.posts for select
  using (public.is_super_admin());

drop policy if exists "Super Admins can view all auditions" on public.auditions;
create policy "Super Admins can view all auditions"
  on public.auditions for select
  using (public.is_super_admin());

drop policy if exists "Super Admins can view all applications" on public.applications;
create policy "Super Admins can view all applications"
  on public.applications for select
  using (public.is_super_admin());

grant select, insert, update, delete on public.admin_roles to anon, authenticated;
grant select, insert, update on public.app_settings to anon, authenticated;

-- Default settings (safe to run again — changes nothing if already set).
insert into public.app_settings (key, value) values
  ('free_mode', 'true'),
  ('pro_price_yearly', '12000'),
  ('premium_price_yearly', '24000')
on conflict (key) do nothing;
