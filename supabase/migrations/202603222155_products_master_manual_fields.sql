alter table public.products_master
  add column if not exists seed_keyword text,
  add column if not exists price_anchor text,
  add column if not exists thumb_anchor text;
create index if not exists ix_products_master_seed_keyword
  on public.products_master(seed_keyword);
