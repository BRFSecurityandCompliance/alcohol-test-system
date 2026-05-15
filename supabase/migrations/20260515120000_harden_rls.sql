-- =====================================================
-- Harden RLS policies
-- =====================================================

-- 1. Replace open public_insert_tests with location-validated policy
--    Prevents inserting test records with forged/non-existent location codes
drop policy if exists "public_insert_tests" on tests;
create policy "public_insert_tests" on tests
  for insert
  with check (
    location_code in (select code from locations)
  );

-- 2. Prevent public read of full persons table (employee PII)
--    Persons should only be read by service role (admin panel)
--    The employee form only needs locations + companies + settings
drop policy if exists "public_read_persons" on persons;

-- 3. Prevent public read of devices (not needed by employee form)
drop policy if exists "public_read_devices" on devices;

-- 4. Prevent public read of admin_users (not needed by employee form)
drop policy if exists "public_read_admin_users" on admin_users;
