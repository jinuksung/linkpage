alter table if exists public.ig_automation_rules
  add column if not exists dm_button_url text;
