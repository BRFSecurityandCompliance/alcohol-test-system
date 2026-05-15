-- =====================================================
-- Tighten RLS — apply ONLY after Cloudflare Worker is deployed
-- Admin operations now go through Worker with service_role (bypasses RLS)
-- Employee form only needs: INSERT tests + SELECT locations/companies/settings
-- =====================================================

-- Remove broad anon_all_* policies on every table
drop policy if exists "anon_all_tests"       on tests;
drop policy if exists "anon_all_persons"     on persons;
drop policy if exists "anon_all_admin_users" on admin_users;
drop policy if exists "anon_all_audit"       on audit_log;
drop policy if exists "anon_all_watchlist"   on watchlist;
drop policy if exists "anon_all_channels"    on alert_channels;
drop policy if exists "anon_all_devices"     on devices;
drop policy if exists "anon_all_companies"   on companies;
drop policy if exists "anon_all_locations"   on locations;
drop policy if exists "anon_all_settings"    on settings;

-- Employee form INSERT on tests is covered by existing "public_insert_tests" policy
-- Employee form SELECT on locations/companies/settings is covered by existing public_read_* policies
-- All admin reads/writes go through /api/admin/* Worker (service_role key — bypasses RLS)
