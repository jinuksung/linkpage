-- Schedule periodic Meta long-lived token refresh

create extension if not exists pg_cron;
create extension if not exists pg_net;
-- Remove prior job if it exists
select cron.unschedule('meta-refresh-tokens-monthly')
where exists (
  select 1 from cron.job where jobname = 'meta-refresh-tokens-monthly'
);
-- Run daily at 03:20 UTC; function itself refreshes only tokens that are >=30 days old
select cron.schedule(
  'meta-refresh-tokens-monthly',
  '20 3 * * *',
  $$
  select
    net.http_post(
      url := 'https://feplbmpnqhpvelvabyyz.functions.supabase.co/meta-refresh-tokens',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"force": false}'::jsonb
    );
  $$
);
