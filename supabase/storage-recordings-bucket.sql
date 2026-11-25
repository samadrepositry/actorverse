-- ACTORVERSE — Phase 2: create the private `recordings` Storage bucket
-- Run this ONCE in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- The bucket CANNOT be created from the app: the app only has the anon key,
-- and creating buckets needs the project owner (this SQL Editor runs as the
-- owner). Safe to run again — it does nothing if the bucket already exists.
--
-- The bucket is PRIVATE: nobody can open a take without a signed link, and
-- the policies below only let a signed-in user upload, view and delete
-- files inside their own folder (<their-user-id>/...).

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload their own takes" on storage.objects;
create policy "Users can upload their own takes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can view their own takes" on storage.objects;
create policy "Users can view their own takes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own takes" on storage.objects;
create policy "Users can delete their own takes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
