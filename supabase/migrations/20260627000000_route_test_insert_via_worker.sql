-- =====================================================
-- Route employee test submissions through the Worker
-- =====================================================
-- Employee submissions now go through the Cloudflare Worker
-- (POST /api/submit-test), which validates the row and performs the INSERT
-- with the service role, then dispatches the alcohol-detected alert as a
-- trusted side effect.
--
-- Anon clients therefore no longer INSERT into `tests` directly. Removing the
-- public insert policy also closes the path where the old, unauthenticated
-- /api/alert endpoint could be triggered for any known test_id.
--
-- Note: the location_code FK on `tests` still enforces a real location at the
-- DB level, so the protection previously provided by this policy's
-- with-check (location_code in locations) is preserved.

drop policy if exists "public_insert_tests" on tests;

-- Anon retains SELECT on locations / companies / settings only (unchanged),
-- which is all the employee form needs to render. Service role (via the
-- Worker) continues to have full access and bypasses RLS.
