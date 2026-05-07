-- Enable pg_cron for scheduled jobs
create extension if not exists pg_cron;

-- Function: clear photo_url and signature_employee for tests older than 30 days
create or replace function expire_old_photos()
returns void
language sql
security definer
as $$
  update tests
  set
    photo_url          = '',
    signature_employee = ''
  where
    created_at < now() - interval '30 days'
    and (photo_url <> '' or signature_employee <> '');
$$;

-- Schedule: run daily at 02:00 UTC
-- Unschedule first in case this migration is re-run
select cron.unschedule('expire-old-photos') where exists (
  select 1 from cron.job where jobname = 'expire-old-photos'
);

select cron.schedule(
  'expire-old-photos',
  '0 2 * * *',
  $cron$select expire_old_photos()$cron$
);
