-- Create test-photos storage bucket for breathalyser photos
-- New submissions upload to Storage; old records retain base64 (backward compat)
insert into storage.buckets (id, name, public)
values ('test-photos', 'test-photos', true)
on conflict (id) do nothing;

-- Allow anon (employee form) to upload
create policy "anon_upload_test_photos" on storage.objects
  for insert to anon
  with check (bucket_id = 'test-photos');

-- Allow anon to read (admin panel uses anon key)
create policy "anon_read_test_photos" on storage.objects
  for select to anon
  using (bucket_id = 'test-photos');

-- Allow service_role full access
create policy "service_all_test_photos" on storage.objects
  for all to service_role
  using (bucket_id = 'test-photos')
  with check (bucket_id = 'test-photos');
