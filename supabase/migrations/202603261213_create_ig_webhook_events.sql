create table if not exists public.ig_webhook_events (
  id bigint generated always as identity primary key,
  stage text not null,
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists ig_webhook_events_created_at_idx
  on public.ig_webhook_events (created_at desc);
