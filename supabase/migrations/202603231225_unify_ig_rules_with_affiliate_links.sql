-- Unify IG automation to use existing affiliate_links table

alter table if exists public.ig_automation_rules
  drop constraint if exists ig_automation_rules_affiliate_link_id_fkey;

alter table if exists public.ig_automation_rules
  add constraint ig_automation_rules_affiliate_link_id_fkey
  foreign key (affiliate_link_id)
  references public.affiliate_links(id)
  on delete restrict;

drop table if exists public.ig_affiliate_links;

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
