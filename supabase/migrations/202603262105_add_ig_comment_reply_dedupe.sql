create table if not exists public.ig_comment_reply_logs (
  id bigint generated always as identity primary key,
  comment_id text not null unique,
  media_id text,
  rule_id uuid,
  replied_at timestamptz not null default now()
);

create index if not exists ig_comment_reply_logs_replied_at_idx
  on public.ig_comment_reply_logs (replied_at desc);
