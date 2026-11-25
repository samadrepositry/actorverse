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
