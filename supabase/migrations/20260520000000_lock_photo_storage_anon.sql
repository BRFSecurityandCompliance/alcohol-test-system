-- Lock down anon access on storage.test-photos: only INSERT + SELECT are
-- allowed (already granted in 20260516000000). Without these explicit DELETE
-- and UPDATE denials, any unauthenticated client that knows or guesses a file
-- path could wipe or overwrite evidence photos via the Supabase Storage API.

create policy "deny_anon_delete_test_photos" on storage.objects
  for delete to anon
  using (false);

create policy "deny_anon_update_test_photos" on storage.objects
  for update to anon
  using (false)
  with check (false);
