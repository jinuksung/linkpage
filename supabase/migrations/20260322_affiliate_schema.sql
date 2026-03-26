-- Affiliate link management schema
-- Generated: 2026-03-22

create extension if not exists pgcrypto;
create table if not exists public.products_master (
  id uuid primary key default gen_random_uuid(),
  product_key text not null unique,
  name text not null,
  brand text,
  model_no text,
  origin_product_url text,
  default_image_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.refresh_jobs (
  id uuid primary key default gen_random_uuid(),
  partner text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'success' check (status in ('success', 'partial', 'failed')),
  target_count int not null default 0,
  success_count int not null default 0,
  fail_count int not null default 0,
  error_summary text,
  created_at timestamptz not null default now()
);
create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products_master(id) on delete cascade,
  partner text not null,
  affiliate_url text not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_current boolean not null default false,
  health_status text not null default 'ok' check (health_status in ('ok', 'expired', 'failed')),
  source_job_id uuid references public.refresh_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  block_type text not null default 'single',
  title text not null,
  subtitle text,
  product_id uuid not null references public.products_master(id) on delete restrict,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.refresh_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.refresh_jobs(id) on delete cascade,
  product_id uuid not null references public.products_master(id) on delete cascade,
  action text not null default 'generate_link',
  status text not null check (status in ('success', 'failed', 'skipped_review')),
  matched_title text,
  matched_price numeric(12,2),
  new_affiliate_link_id uuid references public.affiliate_links(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now()
);
-- Product+partner must have only one current link
create unique index if not exists ux_affiliate_links_current_per_partner
  on public.affiliate_links(product_id, partner)
  where is_current = true;
create index if not exists ix_affiliate_links_expiry
  on public.affiliate_links(expires_at);
create index if not exists ix_affiliate_links_product_partner
  on public.affiliate_links(product_id, partner);
create index if not exists ix_content_blocks_active_order
  on public.content_blocks(is_active, sort_order);
-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_products_master_updated_at on public.products_master;
create trigger trg_products_master_updated_at
before update on public.products_master
for each row execute function public.set_updated_at();
drop trigger if exists trg_content_blocks_updated_at on public.content_blocks;
create trigger trg_content_blocks_updated_at
before update on public.content_blocks
for each row execute function public.set_updated_at();
