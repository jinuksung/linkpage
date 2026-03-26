-- Affiliate links master
create table if not exists public.ig_affiliate_links (
  id uuid primary key default gen_random_uuid(),
  ig_account text not null check (ig_account in ('hotbeaverdeals','hotorideals')),
  label text not null,
  url text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  updated_at timestamptz not null default now()
);
create index if not exists affiliate_links_account_idx on public.ig_affiliate_links (ig_account, status);
-- Instagram automation rules per post(media)
create table if not exists public.ig_automation_rules (
  id uuid primary key default gen_random_uuid(),
  ig_account text not null check (ig_account in ('hotbeaverdeals','hotorideals')),
  media_id text not null,
  trigger_mode text not null default 'keyword' check (trigger_mode in ('keyword','any')),
  keyword_regex text,
  dm_template text not null,
  affiliate_link_id uuid not null references public.ig_affiliate_links(id) on delete restrict,
  reply_variants text[] not null default '{}',
  status text not null default 'active' check (status in ('active','inactive')),
  updated_at timestamptz not null default now(),
  unique (ig_account, media_id)
);
create index if not exists ig_automation_rules_account_idx on public.ig_automation_rules (ig_account, status);
-- DM dedupe logs (optional but recommended)
create table if not exists public.ig_dm_send_logs (
  id bigint generated always as identity primary key,
  ig_account text not null,
  media_id text not null,
  from_user_id text not null,
  sent_at timestamptz not null default now(),
  unique (ig_account, media_id, from_user_id)
);
