alter table if exists public.ig_automation_rules
  add column if not exists dm_button_link_mode text;

update public.ig_automation_rules
set dm_button_link_mode = case
  when coalesce(dm_button_url, '') <> '' then 'manual'
  else 'affiliate'
end
where dm_button_link_mode is null;
