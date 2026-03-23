-- Instagram automation rules per post(media)
create table if not exists public.ig_automation_rules (
  id uuid primary key default gen_random_uuid(),
  ig_account text not null check (ig_account in ('hotbeaverdeals','hotorideals')),
  media_id text not null,
  trigger_mode text not null default 'keyword' check (trigger_mode in ('keyword','any')),
  keyword_regex text,
  dm_template text not null,
  affiliate_link_id uuid not null references public.affiliate_links(id) on delete restrict,
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

-- When a new current affiliate link is generated for the same product+partner,
-- migrate existing campaign rules to the newest link automatically.
create or replace function public.sync_ig_rules_to_current_affiliate_link()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.is_current, false) is true then
    update public.ig_automation_rules r
      set affiliate_link_id = new.id,
          updated_at = now()
    where r.affiliate_link_id in (
      select id
      from public.affiliate_links
      where product_id = new.product_id
        and partner = new.partner
        and id <> new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_ig_rules_to_current_affiliate_link on public.affiliate_links;
create trigger trg_sync_ig_rules_to_current_affiliate_link
after insert or update of is_current on public.affiliate_links
for each row execute function public.sync_ig_rules_to_current_affiliate_link();
