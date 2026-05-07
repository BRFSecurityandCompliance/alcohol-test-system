-- Allow anon (browser) full access — admin auth is enforced at the app level via password
create policy "anon_all_locations"     on locations      for all to anon using (true) with check (true);
create policy "anon_all_companies"     on companies      for all to anon using (true) with check (true);
create policy "anon_all_devices"       on devices        for all to anon using (true) with check (true);
create policy "anon_all_admin_users"   on admin_users    for all to anon using (true) with check (true);
create policy "anon_all_persons"       on persons        for all to anon using (true) with check (true);
create policy "anon_all_tests"         on tests          for all to anon using (true) with check (true);
create policy "anon_all_watchlist"     on watchlist      for all to anon using (true) with check (true);
create policy "anon_all_channels"      on alert_channels for all to anon using (true) with check (true);
create policy "anon_all_audit"         on audit_log      for all to anon using (true) with check (true);
create policy "anon_all_settings"      on settings       for all to anon using (true) with check (true);
