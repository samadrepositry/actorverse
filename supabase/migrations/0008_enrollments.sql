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
