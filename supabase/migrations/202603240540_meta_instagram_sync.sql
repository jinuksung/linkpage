-- Meta Instagram sync storage

create table if not exists public.meta_user_tokens (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meta',
  meta_user_id text not null unique,
  app_id text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ig_accounts (
  id uuid primary key default gen_random_uuid(),
  ig_user_id text not null unique,
  username text,
  page_id text,
  page_name text,
  meta_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ig_media_cache (
  id uuid primary key default gen_random_uuid(),
  ig_user_id text not null,
  media_id text not null unique,
  caption text,
  media_type text,
  media_url text,
  permalink text,
  timestamp timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ig_media_cache_ig_user_idx on public.ig_media_cache(ig_user_id, timestamp desc);
create or replace function public.set_updated_at_generic()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_meta_user_tokens_updated_at on public.meta_user_tokens;
create trigger trg_meta_user_tokens_updated_at
before update on public.meta_user_tokens
for each row execute function public.set_updated_at_generic();
drop trigger if exists trg_ig_accounts_updated_at on public.ig_accounts;
create trigger trg_ig_accounts_updated_at
before update on public.ig_accounts
for each row execute function public.set_updated_at_generic();
drop trigger if exists trg_ig_media_cache_updated_at on public.ig_media_cache;
create trigger trg_ig_media_cache_updated_at
before update on public.ig_media_cache
for each row execute function public.set_updated_at_generic();
