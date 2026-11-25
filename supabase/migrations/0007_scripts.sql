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
