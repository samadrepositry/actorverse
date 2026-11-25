-- ACTORVERSE — Phase 2 migration: recordings table
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- (Running the full supabase/schema.sql again does the same thing.)
-- Creates the recordings table for Teleprompter / Studio takes, with
-- Row Level Security (own rows only) and the table grants the app needs.
-- The video files themselves live in the private `recordings` Storage
-- bucket — create it with supabase/storage-recordings-bucket.sql.

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

grant select, insert, delete on public.recordings to anon, authenticated;
