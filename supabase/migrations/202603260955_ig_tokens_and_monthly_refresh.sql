-- Instagram token store + monthly refresh cron

create extension if not exists pgcrypto;
create extension if not exists http;
create extension if not exists pg_cron;

create table if not exists public.ig_tokens (
  ig_account text primary key check (ig_account in ('hotbeaverdeals', 'hotorideals')),
  ig_user_id text not null,
  access_token text not null,
  expires_at timestamptz,
  last_refreshed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.ig_token_settings (
  id int primary key default 1 check (id = 1),
  meta_app_id text not null,
  meta_app_secret text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ig_tokens_updated_at on public.ig_tokens;
create trigger trg_ig_tokens_updated_at
before update on public.ig_tokens
for each row execute function public.set_updated_at();

drop trigger if exists trg_ig_token_settings_updated_at on public.ig_token_settings;
create trigger trg_ig_token_settings_updated_at
before update on public.ig_token_settings
for each row execute function public.set_updated_at();

create or replace function public.refresh_instagram_long_lived_tokens()
returns void
language plpgsql
security definer
as $$
declare
  cfg record;
  t record;
  refresh_url text;
  resp record;
  body jsonb;
  new_token text;
  expires_in int;
begin
  select meta_app_id, meta_app_secret
    into cfg
  from public.ig_token_settings
  where id = 1;

  if cfg.meta_app_id is null or cfg.meta_app_secret is null then
    raise exception 'ig_token_settings(id=1) is required';
  end if;

  for t in select ig_account, access_token from public.ig_tokens loop
    begin
      refresh_url := format(
        'https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=%s&client_secret=%s&fb_exchange_token=%s',
        cfg.meta_app_id,
        cfg.meta_app_secret,
        t.access_token
      );

      select * into resp from http_get(refresh_url);
      body := coalesce(resp.content::jsonb, '{}'::jsonb);

      new_token := body->>'access_token';
      expires_in := nullif(body->>'expires_in', '')::int;

      if new_token is null or new_token = '' then
        raise exception 'Token refresh failed: %', body::text;
      end if;

      update public.ig_tokens
      set access_token = new_token,
          expires_at = case when expires_in is null then expires_at else now() + make_interval(secs => expires_in) end,
          last_refreshed_at = now(),
          last_error = null
      where ig_account = t.ig_account;
    exception when others then
      update public.ig_tokens
      set last_error = sqlerrm
      where ig_account = t.ig_account;
    end;
  end loop;
end;
$$;

-- monthly at 03:00 UTC on day 1
select cron.unschedule('ig-token-refresh-monthly')
where exists (select 1 from cron.job where jobname = 'ig-token-refresh-monthly');

select cron.schedule(
  'ig-token-refresh-monthly',
  '0 3 1 * *',
  $$select public.refresh_instagram_long_lived_tokens();$$
);
