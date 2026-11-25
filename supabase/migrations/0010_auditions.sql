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
