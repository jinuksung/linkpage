create table if not exists public.link_pages (
  slug text primary key,
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_link_pages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_link_pages_updated_at on public.link_pages;

create trigger trg_link_pages_updated_at
before update on public.link_pages
for each row
execute function public.set_link_pages_updated_at();
