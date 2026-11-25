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
