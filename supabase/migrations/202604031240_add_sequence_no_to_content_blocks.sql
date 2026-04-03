create sequence if not exists public.content_blocks_sequence_no_seq;

alter table public.content_blocks
add column if not exists sequence_no bigint;

alter table public.content_blocks
alter column sequence_no set default nextval('public.content_blocks_sequence_no_seq');

with ranked as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from public.content_blocks
  where sequence_no is null
)
update public.content_blocks cb
set sequence_no = ranked.rn
from ranked
where cb.id = ranked.id;

update public.content_blocks
set sequence_no = nextval('public.content_blocks_sequence_no_seq')
where sequence_no is null;

select setval(
  'public.content_blocks_sequence_no_seq',
  greatest(coalesce((select max(sequence_no)::bigint from public.content_blocks), 1), 1),
  true
);

alter table public.content_blocks
alter column sequence_no set not null;

create unique index if not exists ux_content_blocks_sequence_no
on public.content_blocks(sequence_no);
